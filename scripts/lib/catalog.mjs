import { readFile, readdir } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

import Ajv2020 from 'ajv/dist/2020.js'
import { parseDocument } from 'yaml'

const moduleDirectory = path.dirname(fileURLToPath(import.meta.url))

export const repositoryRoot = path.resolve(moduleDirectory, '../..')

const collections = [
  ['capabilities', 'capabilities'],
  ['slots', 'slots'],
  ['options', 'options'],
  ['parts', 'parts'],
  ['offers', 'offers'],
  ['assets', 'assets'],
]

export class CatalogValidationError extends Error {
  constructor(issues) {
    super(
      `Catalog validation failed:\n${issues.map((issue) => `- ${issue}`).join('\n')}`,
    )
    this.name = 'CatalogValidationError'
    this.issues = issues
  }
}

export function capabilityIdFromConstraint(constraint) {
  return typeof constraint === 'string' ? constraint : constraint.capability
}

async function parseYamlFile(filePath) {
  const source = await readFile(filePath, 'utf8')
  const document = parseDocument(source, {
    prettyErrors: true,
    strict: true,
    uniqueKeys: true,
  })

  if (document.errors.length > 0) {
    const relativePath = path.relative(repositoryRoot, filePath)
    throw new CatalogValidationError(
      document.errors.map((error) => `${relativePath}: ${error.message}`),
    )
  }

  return document.toJS()
}

async function loadCollection(directoryName) {
  const directoryPath = path.join(repositoryRoot, 'catalog', directoryName)
  const entries = await readdir(directoryPath, { withFileTypes: true })
  const yamlFiles = entries
    .filter(
      (entry) =>
        entry.isFile() &&
        (entry.name.endsWith('.yaml') || entry.name.endsWith('.yml')),
    )
    .map((entry) => entry.name)
    .sort((left, right) => left.localeCompare(right))

  const values = []
  const origins = []

  for (const fileName of yamlFiles) {
    const filePath = path.join(directoryPath, fileName)
    values.push(await parseYamlFile(filePath))
    origins.push(path.relative(repositoryRoot, filePath))
  }

  return { values, origins }
}

function formatSchemaIssue(error, origins) {
  const segments = error.instancePath.split('/').filter(Boolean)
  const collection = segments[0]
  const index = Number(segments[1])
  const origin = Number.isInteger(index)
    ? origins[collection]?.[index]
    : undefined
  const location = origin ?? 'catalog/catalog.yaml'
  const recordPath = segments.slice(2).join('.')
  const missingProperty = error.params?.missingProperty
  const propertyPath = [recordPath, missingProperty].filter(Boolean).join('.')
  return `${location}${propertyPath ? ` (${propertyPath})` : ''}: ${error.message}`
}

function duplicateIssues(collectionName, records, origins) {
  const firstOriginById = new Map()
  const issues = []

  records.forEach((record, index) => {
    if (typeof record?.id !== 'string') return
    const firstOrigin = firstOriginById.get(record.id)
    if (firstOrigin) {
      issues.push(
        `${origins[index]} (id): duplicate ${collectionName} ID "${record.id}"; first declared in ${firstOrigin}`,
      )
      return
    }
    firstOriginById.set(record.id, origins[index])
  })

  return issues
}

function dependencyCycleIssues(authorCatalog, origins) {
  const providersByCapability = new Map()
  for (const option of authorCatalog.options) {
    for (const capability of option.provides) {
      const providers = providersByCapability.get(capability) ?? []
      providers.push(option.id)
      providersByCapability.set(capability, providers)
    }
  }

  const optionById = new Map(
    authorCatalog.options.map((option) => [option.id, option]),
  )
  const optionIndexById = new Map(
    authorCatalog.options.map((option, index) => [option.id, index]),
  )
  const graph = new Map()
  for (const option of authorCatalog.options) {
    const dependencies = new Set()
    for (const requirement of option.requires) {
      const requiredCapability = capabilityIdFromConstraint(requirement)
      for (const providerId of providersByCapability.get(requiredCapability) ??
        []) {
        dependencies.add(providerId)
      }
    }
    graph.set(option.id, dependencies)
  }

  const issues = []
  const seenCycles = new Set()

  function visit(startId, currentId, pathIds, visited) {
    for (const dependencyId of graph.get(currentId) ?? []) {
      if (dependencyId === startId) {
        const cycle = [...pathIds, startId]
        const key = [...new Set(cycle)].sort().join('|')
        if (!seenCycles.has(key)) {
          seenCycles.add(key)
          const index = optionIndexById.get(startId)
          issues.push(
            `${origins.options[index]} (requires): option dependency cycle ${cycle.join(' -> ')}`,
          )
        }
        continue
      }
      if (visited.has(dependencyId) || !optionById.has(dependencyId)) continue
      visit(
        startId,
        dependencyId,
        [...pathIds, dependencyId],
        new Set([...visited, dependencyId]),
      )
    }
  }

  for (const option of authorCatalog.options) {
    visit(option.id, option.id, [option.id], new Set([option.id]))
  }

  return issues
}

function reachabilityIssues(authorCatalog, origins) {
  const selectedCapabilities = new Set()
  const reachableOptionIds = new Set()
  let changed = true

  while (changed) {
    changed = false
    for (const option of authorCatalog.options) {
      if (reachableOptionIds.has(option.id) || option.status === 'deprecated')
        continue
      const requirementsSatisfied = option.requires.every((required) =>
        selectedCapabilities.has(capabilityIdFromConstraint(required)),
      )
      if (!requirementsSatisfied) continue
      reachableOptionIds.add(option.id)
      option.provides.forEach((provided) => selectedCapabilities.add(provided))
      changed = true
    }
  }

  const issues = []
  authorCatalog.slots.forEach((slot, slotIndex) => {
    if (slot.cardinality !== 'one') return
    const hasReachableOption = authorCatalog.options.some(
      (option) => option.slot === slot.id && reachableOptionIds.has(option.id),
    )
    if (!hasReachableOption) {
      issues.push(
        `${origins.slots[slotIndex]} (cardinality): required slot "${slot.id}" has no reachable non-deprecated option`,
      )
    }
  })
  return issues
}

export function validateCatalogSemantics(authorCatalog, origins) {
  const issues = []

  for (const [collectionName] of collections) {
    issues.push(
      ...duplicateIssues(
        collectionName,
        authorCatalog[collectionName],
        origins[collectionName],
      ),
    )
  }

  const globallyDeclared = new Map()
  for (const collectionName of [
    'slots',
    'options',
    'parts',
    'offers',
    'assets',
  ]) {
    authorCatalog[collectionName].forEach((record, index) => {
      const existing = globallyDeclared.get(record.id)
      if (existing) {
        issues.push(
          `${origins[collectionName][index]} (id): ID "${record.id}" is also used by ${existing.collection} in ${existing.origin}`,
        )
      } else {
        globallyDeclared.set(record.id, {
          collection: collectionName,
          origin: origins[collectionName][index],
        })
      }
    })
  }

  const slotIds = new Set(authorCatalog.slots.map((slot) => slot.id))
  const partById = new Map(authorCatalog.parts.map((part) => [part.id, part]))
  const assetIds = new Set(authorCatalog.assets.map((asset) => asset.id))
  const capabilityIds = new Set(
    authorCatalog.capabilities.map((capability) => capability.id),
  )

  authorCatalog.options.forEach((option, optionIndex) => {
    const origin = origins.options[optionIndex]
    if (!slotIds.has(option.slot)) {
      issues.push(`${origin} (slot): unknown slot ID "${option.slot}"`)
    }
    option.assets.forEach((assetId, assetIndex) => {
      if (!assetIds.has(assetId)) {
        issues.push(
          `${origin} (assets.${assetIndex}): unknown asset ID "${assetId}" for option "${option.id}"`,
        )
      }
    })
    for (const field of ['provides', 'requires', 'conflicts']) {
      option[field].forEach((capabilityId, capabilityIndex) => {
        const referencedCapability = capabilityIdFromConstraint(capabilityId)
        if (!capabilityIds.has(referencedCapability)) {
          issues.push(
            `${origin} (${field}.${capabilityIndex}): unknown capability ID "${referencedCapability}"`,
          )
        }
      })
    }
    option.bom.forEach((contribution, contributionIndex) => {
      const part = partById.get(contribution.part)
      if (!part) {
        issues.push(
          `${origin} (bom.${contributionIndex}.part): unknown part ID "${contribution.part}"`,
        )
      } else if (contribution.unit && contribution.unit !== part.default_unit) {
        issues.push(
          `${origin} (bom.${contributionIndex}.unit): unit "${contribution.unit}" does not match part "${part.id}" default unit "${part.default_unit}"`,
        )
      }
    })
  })

  authorCatalog.offers.forEach((offer, offerIndex) => {
    if (!partById.has(offer.part)) {
      issues.push(
        `${origins.offers[offerIndex]} (part): unknown part ID "${offer.part}"`,
      )
    }
  })

  authorCatalog.assets.forEach((asset, assetIndex) => {
    const origin = origins.assets[assetIndex]
    if (asset.source.repository !== 'ossm-hardware') {
      issues.push(
        `${origin} (source.repository): unsupported source repository "${asset.source.repository}"`,
      )
    }
    if (asset.source.commit !== authorCatalog.hardware_source.commit) {
      issues.push(
        `${origin} (source.commit): expected locked commit ${authorCatalog.hardware_source.commit}, received ${asset.source.commit}`,
      )
    }
    if (
      path.isAbsolute(asset.source.path) ||
      asset.source.path.split(/[\\/]/).includes('..')
    ) {
      issues.push(
        `${origin} (source.path): source path must be repository-relative and cannot contain ".."`,
      )
    }
  })

  issues.push(...dependencyCycleIssues(authorCatalog, origins))
  issues.push(...reachabilityIssues(authorCatalog, origins))

  if (issues.length > 0) throw new CatalogValidationError(issues)
}

function normalizeEvidence(evidence) {
  return {
    state: evidence.state,
    notes: evidence.notes,
    sources: evidence.sources.map((source) => ({ ...source })),
  }
}

function normalizeConstraint(constraint) {
  if (typeof constraint === 'string') return constraint
  return {
    capability: constraint.capability,
    explanation: constraint.explanation,
    ...(constraint.evidence
      ? { evidence: normalizeEvidence(constraint.evidence) }
      : {}),
  }
}

export function normalizeCatalog(authorCatalog, generatedAssets = new Map()) {
  return {
    schemaVersion: authorCatalog.schema_version,
    catalogVersion: authorCatalog.catalog_version,
    hardwareSource: {
      repository: authorCatalog.hardware_source.repository,
      commit: authorCatalog.hardware_source.commit,
    },
    capabilities: authorCatalog.capabilities.map((capability) => ({
      ...capability,
    })),
    slots: [...authorCatalog.slots]
      .sort(
        (left, right) =>
          left.order - right.order || left.id.localeCompare(right.id),
      )
      .map((slot) => ({ ...slot })),
    options: [...authorCatalog.options]
      .sort((left, right) => left.id.localeCompare(right.id))
      .map((option) => ({
        id: option.id,
        slotId: option.slot,
        label: option.label,
        ...(option.description ? { description: option.description } : {}),
        status: option.status,
        provides: [...option.provides],
        requires: option.requires.map(normalizeConstraint),
        conflicts: option.conflicts.map(normalizeConstraint),
        assetIds: [...option.assets],
        bom: option.bom.map((contribution) => ({
          partId: contribution.part,
          quantity: contribution.quantity,
          ...(contribution.unit ? { unit: contribution.unit } : {}),
          reason: contribution.reason,
        })),
        evidence: normalizeEvidence(option.evidence),
        warnings: option.warnings.map((warning) => ({
          id: warning.id,
          severity: warning.severity,
          message: warning.message,
          evidence: normalizeEvidence(warning.evidence),
        })),
      })),
    parts: [...authorCatalog.parts]
      .sort((left, right) => left.id.localeCompare(right.id))
      .map((part) => ({
        id: part.id,
        label: part.label,
        kind: part.kind,
        specification: { ...part.specification },
        defaultUnit: part.default_unit,
        evidence: normalizeEvidence(part.evidence),
      })),
    offers: [...authorCatalog.offers]
      .sort((left, right) => left.id.localeCompare(right.id))
      .map((offer) => ({
        id: offer.id,
        partId: offer.part,
        vendor: offer.vendor,
        region: offer.region,
        currency: offer.currency,
        packageQuantity: offer.package_quantity,
        packagePrice: offer.package_price,
        updatedAt: offer.updated_at,
        ...(offer.url ? { url: offer.url } : {}),
      })),
    assets: [...authorCatalog.assets]
      .sort((left, right) => left.id.localeCompare(right.id))
      .map((asset) => ({
        id: asset.id,
        role: asset.role,
        format: asset.format,
        source: { ...asset.source },
        ...(generatedAssets.has(asset.id)
          ? { generated: { ...generatedAssets.get(asset.id) } }
          : {}),
      })),
  }
}

export function validateCatalogShape(authorCatalog, origins, schema) {
  const ajv = new Ajv2020({ allErrors: true, strict: true })
  const validate = ajv.compile(schema)
  if (!validate(authorCatalog)) {
    throw new CatalogValidationError(
      validate.errors.map((error) => formatSchemaIssue(error, origins)),
    )
  }
}

export async function loadAndValidateCatalog() {
  const metadataPath = path.join(repositoryRoot, 'catalog/catalog.yaml')
  const lockPath = path.join(repositoryRoot, 'sources/ossm-hardware.lock.json')
  const schemaPath = path.join(
    repositoryRoot,
    'catalog/schema/catalog.schema.json',
  )

  const [metadata, lock, schema] = await Promise.all([
    parseYamlFile(metadataPath),
    readFile(lockPath, 'utf8').then(JSON.parse),
    readFile(schemaPath, 'utf8').then(JSON.parse),
  ])

  const loadedCollections = await Promise.all(
    collections.map(async ([collectionName, directoryName]) => [
      collectionName,
      await loadCollection(directoryName),
    ]),
  )
  const origins = Object.fromEntries(
    loadedCollections.map(([collectionName, loaded]) => [
      collectionName,
      loaded.origins,
    ]),
  )
  const authorCatalog = {
    ...metadata,
    hardware_source: {
      repository: lock.repository,
      commit: lock.ref,
    },
    ...Object.fromEntries(
      loadedCollections.map(([collectionName, loaded]) => [
        collectionName,
        loaded.values,
      ]),
    ),
  }

  validateCatalogShape(authorCatalog, origins, schema)
  validateCatalogSemantics(authorCatalog, origins)
  return {
    authorCatalog,
    origins,
    lock,
    normalized: normalizeCatalog(authorCatalog),
  }
}

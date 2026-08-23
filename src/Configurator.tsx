import { useMemo, useState } from 'react'

import App from './App'
import { catalog } from './catalog'
import type { Catalog, Evidence, Option } from './catalog'
import type {
  BomViewModel,
  ConfigurationNoticeViewModel,
  PreviewModelViewModel,
  SlotViewModel,
} from './components/view-models'
import {
  aggregateBom,
  createConfigurationExport,
  evaluateCandidate,
  resolveCompatibility,
  selectCandidate,
  selectedOptionIds,
  serializeConfigurationExport,
} from './engine'
import type { Selection } from './engine'

export default function Configurator() {
  const [selection, setSelection] = useState<Selection>(() =>
    createDefaultSelection(catalog),
  )
  const [focusedOptionId, setFocusedOptionId] = useState<string | undefined>(
    () => defaultPreviewOptionId(catalog, createDefaultSelection(catalog)),
  )

  const optionById = useMemo(
    () => new Map(catalog.options.map((option) => [option.id, option])),
    [],
  )
  const selectedBySlot = useMemo(
    () => selectionForSingleCardinalitySlots(selection),
    [selection],
  )
  const slots = useMemo(
    () => createSlotViewModels(catalog, selection),
    [selection],
  )
  const bomResult = useMemo(
    () =>
      aggregateBom({
        options: catalog.options,
        selection,
        parts: catalog.parts,
        offers: catalog.offers,
      }),
    [selection],
  )
  const bom = useMemo(() => createBomViewModel(catalog, bomResult), [bomResult])
  const notices = useMemo(() => createNotices(catalog, selection), [selection])
  const previewOption = focusedOptionId
    ? optionById.get(focusedOptionId)
    : undefined
  const preview = createPreview(catalog, previewOption)

  const select = (slotId: string, optionId: string) => {
    const option = optionById.get(optionId)
    if (!option || option.slotId !== slotId) return

    setSelection((current) => selectCandidate(current, option))
    setFocusedOptionId(optionId)
  }

  const clear = (slotId: string) => {
    setSelection((current) => {
      const next = { ...current }
      delete next[slotId]
      return next
    })
  }

  const exportConfiguration = () => {
    const configuration = createConfigurationExport({
      schemaVersion: catalog.schemaVersion,
      catalogVersion: catalog.catalogVersion,
      hardwareSource: catalog.hardwareSource,
      options: catalog.options,
      parts: catalog.parts,
      offers: catalog.offers,
      selection,
    })
    downloadJson(
      `ossm-configuration-${catalog.catalogVersion}.json`,
      serializeConfigurationExport(configuration),
    )
  }

  return (
    <App
      catalogState={{
        status: 'ready',
        catalogVersion: catalog.catalogVersion,
      }}
      slots={slots}
      selectedBySlot={selectedBySlot}
      preview={{
        title: previewOption?.label,
        model: preview,
      }}
      bom={bom}
      notices={notices}
      sourceRevision={{
        repository: 'OSSM-hardware',
        commit: catalog.hardwareSource.commit,
      }}
      onSelect={select}
      onClear={clear}
      onExport={exportConfiguration}
    />
  )
}

function createDefaultSelection(source: Catalog): Selection {
  let selection: Selection = {}

  for (const slot of [...source.slots].sort(
    (left, right) =>
      left.order - right.order || left.id.localeCompare(right.id),
  )) {
    const options = source.options
      .filter((option) => option.slotId === slot.id)
      .sort((left, right) => left.id.localeCompare(right.id))

    for (const option of options) {
      const candidate = evaluateCandidate({
        options: source.options,
        selection,
        candidateId: option.id,
      })
      if (candidate.valid) {
        selection = candidate.selection
        break
      }
    }
  }

  return selection
}

function createSlotViewModels(
  source: Catalog,
  selection: Selection,
): SlotViewModel[] {
  return [...source.slots]
    .sort(
      (left, right) =>
        left.order - right.order || left.id.localeCompare(right.id),
    )
    .map((slot) => ({
      id: slot.id,
      label: slot.label,
      description: slot.description,
      required: slot.cardinality === 'one',
      options: source.options
        .filter((option) => option.slotId === slot.id)
        .sort((left, right) => left.id.localeCompare(right.id))
        .map((option) => {
          const result = evaluateCandidate({
            options: source.options,
            selection,
            candidateId: option.id,
          })

          return {
            id: option.id,
            label: option.label,
            description: option.description,
            status: option.status,
            evidence: evidenceViewModel(option.evidence),
            selectable: result.valid,
            reasons: result.valid
              ? []
              : result.explanations.map((explanation) => ({
                  message: explanation.message,
                  evidence: explanation.evidence
                    ? evidenceViewModel(explanation.evidence)
                    : undefined,
                })),
          }
        }),
    }))
}

function createBomViewModel(
  source: Catalog,
  result: ReturnType<typeof aggregateBom>,
): BomViewModel {
  const optionById = new Map(
    source.options.map((option) => [option.id, option]),
  )

  return {
    lines: result.lines.map((line) => ({
      partId: line.partId,
      label: line.label ?? line.partId,
      quantity: line.quantity,
      unit: line.unit,
      contributors: line.contributors.map((id) => ({
        id,
        label: optionById.get(id)?.label,
      })),
      price:
        line.price.complete &&
        line.price.amount !== undefined &&
        line.price.currency
          ? {
              lineTotal: {
                amount: line.price.amount,
                currency: line.price.currency,
              },
              vendor: line.price.vendor,
            }
          : undefined,
    })),
    totals:
      result.price.complete &&
      result.price.total !== undefined &&
      result.price.currency
        ? [
            {
              amount: result.price.total,
              currency: result.price.currency,
            },
          ]
        : [],
    incompletePricePartIds: result.lines
      .filter((line) => !line.price.complete)
      .map((line) => line.partId),
  }
}

function createNotices(
  source: Catalog,
  selection: Selection,
): ConfigurationNoticeViewModel[] {
  const optionById = new Map(
    source.options.map((option) => [option.id, option]),
  )
  const warnings = selectedOptionIds(selection).flatMap((optionId) => {
    const option = optionById.get(optionId)
    if (!option) return []

    return option.warnings.map((warning) => ({
      id: `${optionId}:${warning.id}`,
      severity:
        warning.severity === 'critical' ? ('error' as const) : warning.severity,
      title: `${option.label} warning`,
      message: warning.message,
      evidence: evidenceViewModel(warning.evidence),
    }))
  })
  const compatibility = resolveCompatibility({
    options: source.options,
    selection,
  }).explanations.map((explanation, index) => ({
    id: `compatibility:${explanation.optionId}:${explanation.capability ?? index}`,
    severity: 'error' as const,
    title: 'Incompatible selection',
    message: explanation.message,
    evidence: explanation.evidence
      ? evidenceViewModel(explanation.evidence)
      : undefined,
  }))

  return [...compatibility, ...warnings]
}

function createPreview(
  source: Catalog,
  option: Option | undefined,
): PreviewModelViewModel | null {
  if (!option || option.assetIds.length === 0) return null

  const assetId = option.assetIds[0]
  const asset = source.assets.find((candidate) => candidate.id === assetId)
  if (!asset) {
    return {
      status: 'missing',
      reason: `Catalog asset ${assetId ?? '(missing ID)'} does not exist.`,
    }
  }
  if (!asset.generated) {
    return {
      status: 'missing',
      reason: 'The referenced source model has not been prepared.',
      sourcePath: asset.source.path,
      sourceCommit: asset.source.commit,
    }
  }

  return {
    status: 'available',
    url: `${import.meta.env.BASE_URL}${asset.generated.url.replace(/^\/+/, '')}`,
    sourcePath: asset.source.path,
    sourceCommit: asset.source.commit,
    contentHash: asset.generated.contentHash,
  }
}

function selectionForSingleCardinalitySlots(
  selection: Selection,
): Record<string, string | undefined> {
  return Object.fromEntries(
    Object.entries(selection).map(([slotId, value]) => [
      slotId,
      typeof value === 'string' ? value : undefined,
    ]),
  )
}

function defaultPreviewOptionId(
  source: Catalog,
  selection: Selection,
): string | undefined {
  const optionById = new Map(
    source.options.map((option) => [option.id, option]),
  )
  return selectedOptionIds(selection).find(
    (optionId) => (optionById.get(optionId)?.assetIds.length ?? 0) > 0,
  )
}

function evidenceViewModel(evidence: Evidence) {
  return {
    state: evidence.state,
    notes: evidence.notes,
  }
}

function downloadJson(filename: string, contents: string) {
  const blob = new Blob([contents], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  link.click()
  URL.revokeObjectURL(url)
}

import { createHash } from 'node:crypto'
import { execFileSync } from 'node:child_process'
import { access, mkdir, rm, writeFile } from 'node:fs/promises'
import path from 'node:path'

import {
  CatalogValidationError,
  normalizeCatalog,
  repositoryRoot,
} from './catalog.mjs'
import { writeJsonAtomically } from './generated-files.mjs'

function git(repositoryPath, arguments_, options = {}) {
  return execFileSync('git', ['-C', repositoryPath, ...arguments_], {
    encoding: options.encoding ?? 'utf8',
    maxBuffer: 512 * 1024 * 1024,
    stdio: ['ignore', 'pipe', 'pipe'],
  })
}

async function directoryExists(directoryPath) {
  try {
    await access(directoryPath)
    return true
  } catch {
    return false
  }
}

function normalizedRemote(remote) {
  return remote
    .trim()
    .replace(/^git@github\.com:/, 'https://github.com/')
    .replace(/\.git$/, '')
    .replace(/\/$/, '')
}

function verifyRepository(repositoryPath, lock) {
  let topLevel
  let origin
  let resolvedCommit
  try {
    topLevel = git(repositoryPath, ['rev-parse', '--show-toplevel']).trim()
    origin = git(repositoryPath, ['remote', 'get-url', 'origin']).trim()
    resolvedCommit = git(repositoryPath, [
      'rev-parse',
      `${lock.ref}^{commit}`,
    ]).trim()
  } catch (error) {
    const stderr = error?.stderr?.toString().trim()
    throw new Error(
      `Hardware source ${repositoryPath} is not a usable git checkout${stderr ? `: ${stderr}` : '.'}`,
    )
  }

  const acceptedRemotes = [lock.repository, lock.sshRepository]
    .filter(Boolean)
    .map(normalizedRemote)
  if (!acceptedRemotes.includes(normalizedRemote(origin))) {
    throw new Error(
      `Hardware source ${topLevel} has origin ${origin}, expected ${lock.repository}.`,
    )
  }
  if (resolvedCommit !== lock.ref) {
    throw new Error(
      `Hardware source resolved ${lock.ref} to ${resolvedCommit}; refusing unpinned input.`,
    )
  }
  return topLevel
}

async function fetchPinnedCache(lock) {
  const cachePath = path.join(repositoryRoot, 'sources/.cache/ossm-hardware')
  await mkdir(cachePath, { recursive: true })

  if (!(await directoryExists(path.join(cachePath, '.git')))) {
    execFileSync('git', ['init', cachePath], {
      stdio: ['ignore', 'pipe', 'pipe'],
    })
    git(cachePath, ['remote', 'add', 'origin', lock.repository])
  }

  try {
    git(cachePath, ['cat-file', '-e', `${lock.ref}^{commit}`])
  } catch {
    console.log(
      `Fetching pinned OSSM-hardware commit ${lock.ref} into sources/.cache.`,
    )
    git(cachePath, ['fetch', '--depth=1', 'origin', lock.ref])
  }

  return verifyRepository(cachePath, lock)
}

export async function resolveHardwareRepository(lock, options = {}) {
  const explicitPath = process.env.OSSM_HARDWARE_PATH
  if (explicitPath) {
    const resolvedExplicitPath = path.resolve(explicitPath)
    if (!(await directoryExists(resolvedExplicitPath))) {
      throw new Error(
        `OSSM_HARDWARE_PATH does not exist: ${resolvedExplicitPath}`,
      )
    }
    return verifyRepository(resolvedExplicitPath, lock)
  }

  const siblingPath = path.resolve(repositoryRoot, '../ossm-hardware')
  if (await directoryExists(siblingPath)) {
    return verifyRepository(siblingPath, lock)
  }

  if (options.allowFetch === false) {
    throw new Error(
      `No OSSM-hardware checkout found. Set OSSM_HARDWARE_PATH or place it at ${siblingPath}.`,
    )
  }
  return fetchPinnedCache(lock)
}

export function readAssetAtCommit(repositoryPath, commit, sourcePath) {
  try {
    return git(repositoryPath, ['show', `${commit}:${sourcePath}`], {
      encoding: 'buffer',
    })
  } catch (error) {
    const stderr = error?.stderr?.toString().trim()
    throw new Error(
      `${commit}:${sourcePath}: ${stderr || 'git could not read the object'}`,
    )
  }
}

export async function prepareModels({ authorCatalog, lock, normalized }) {
  const repositoryPath = await resolveHardwareRepository(lock)
  const modelsDirectory = path.join(repositoryRoot, 'public/generated/models')
  const generatedAssets = new Map()
  const manifestAssets = []
  const preparedFiles = []
  const issues = []

  for (const asset of authorCatalog.assets) {
    const extension = asset.format.toLowerCase()
    const outputFileName = `${asset.id}.${extension}`
    let contents
    try {
      contents = readAssetAtCommit(
        repositoryPath,
        asset.source.commit,
        asset.source.path,
      )
    } catch (error) {
      const optionIds = authorCatalog.options
        .filter((option) => option.assets.includes(asset.id))
        .map((option) => option.id)
      issues.push(
        `asset "${asset.id}" referenced by option(s) ${optionIds.join(', ') || '(none)'}: cannot read ${asset.source.commit}:${asset.source.path}: ${error.message}`,
      )
      continue
    }

    const contentHash = `sha256:${createHash('sha256').update(contents).digest('hex')}`
    const generated = {
      url: `generated/models/${outputFileName}`,
      contentHash,
    }
    preparedFiles.push({ outputFileName, contents })
    generatedAssets.set(asset.id, generated)
    manifestAssets.push({
      id: asset.id,
      role: asset.role,
      format: asset.format,
      source: { ...asset.source },
      generated,
    })
  }

  if (issues.length > 0) throw new CatalogValidationError(issues)

  // This directory is exclusively generated. Recreating it prevents removed
  // catalog assets from leaking into a later deployment artifact.
  await rm(modelsDirectory, { recursive: true, force: true })
  await mkdir(modelsDirectory, { recursive: true })
  await Promise.all(
    preparedFiles.map(({ outputFileName, contents }) =>
      writeFile(path.join(modelsDirectory, outputFileName), contents),
    ),
  )

  const enrichedCatalog = normalizeCatalog(authorCatalog, generatedAssets)
  const manifest = {
    schemaVersion: 1,
    hardwareSource: {
      repository: lock.repository,
      commit: lock.ref,
    },
    assets: manifestAssets.sort((left, right) =>
      left.id.localeCompare(right.id),
    ),
  }

  await Promise.all([
    writeJsonAtomically(
      path.join(repositoryRoot, 'public/generated/assets.json'),
      manifest,
    ),
    writeJsonAtomically(
      path.join(repositoryRoot, 'src/catalog/generated/catalog.json'),
      enrichedCatalog,
    ),
  ])

  return {
    repositoryPath,
    normalized: enrichedCatalog,
    manifest,
    previousNormalized: normalized,
  }
}

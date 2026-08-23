#!/usr/bin/env node

import path from 'node:path'

import { loadAndValidateCatalog, repositoryRoot } from './lib/catalog.mjs'
import { prepareModels } from './lib/hardware-assets.mjs'

try {
  const loaded = await loadAndValidateCatalog()
  const result = await prepareModels(loaded)
  console.log(
    `Prepared ${result.manifest.assets.length} model(s) from exact git tree ${loaded.lock.ref}.`,
  )
  console.log(`Hardware source: ${result.repositoryPath}`)
  console.log(
    `Manifest: ${path.relative(repositoryRoot, path.join(repositoryRoot, 'public/generated/assets.json'))}`,
  )
} catch (error) {
  console.error(error instanceof Error ? error.message : error)
  process.exitCode = 1
}

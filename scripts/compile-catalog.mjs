#!/usr/bin/env node

import path from 'node:path'

import { loadAndValidateCatalog, repositoryRoot } from './lib/catalog.mjs'
import { writeJsonAtomically } from './lib/generated-files.mjs'

const outputPath = path.join(
  repositoryRoot,
  'src/catalog/generated/catalog.json',
)

try {
  const { normalized } = await loadAndValidateCatalog()
  await writeJsonAtomically(outputPath, normalized)
  console.log(
    `Validated ${normalized.slots.length} slots, ${normalized.options.length} options, ${normalized.parts.length} parts, and ${normalized.assets.length} assets.`,
  )
  console.log(`Wrote ${path.relative(repositoryRoot, outputPath)}.`)
} catch (error) {
  console.error(error instanceof Error ? error.message : error)
  process.exitCode = 1
}

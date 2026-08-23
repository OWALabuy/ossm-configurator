import generatedCatalog from './generated/catalog.json'

import type { Catalog } from './types'

// The artifact is produced only after JSON Schema and semantic validation.
// JSON imports widen literals, so the trust boundary is explicit here.
export const catalog = generatedCatalog as unknown as Catalog

export * from './types'

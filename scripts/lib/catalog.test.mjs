import { readFile } from 'node:fs/promises'
import path from 'node:path'

import { describe, expect, it } from 'vitest'

import {
  CatalogValidationError,
  loadAndValidateCatalog,
  loadCollection,
  repositoryRoot,
  validateCatalogSemantics,
  validateCatalogShape,
} from './catalog.mjs'

function clone(value) {
  return structuredClone(value)
}

describe('catalog compilation', () => {
  it('treats an absent optional collection directory as empty', async () => {
    await expect(
      loadCollection('optional-directory-that-does-not-exist', {
        optional: true,
      }),
    ).resolves.toEqual({ values: [], origins: [] })
  })

  it('loads and normalizes the repository catalog', async () => {
    const { normalized } = await loadAndValidateCatalog()

    expect(normalized.schemaVersion).toBe(1)
    expect(normalized.slots.map((slot) => slot.id)).toEqual([
      'motor_interface',
      'motor_mount',
      'controller',
      'toy_interface',
    ])
    expect(
      normalized.options.find((option) => option.id === 'controller.diy-esp32')
        ?.warnings,
    ).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          id: 'stock-homing-current-sense-missing',
          severity: 'critical',
        }),
      ]),
    )
    expect(
      normalized.options.find(
        (option) => option.id === 'mount.pitclamp-mini-57aim-v1',
      )?.conflicts,
    ).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          capability: 'motor.interface:pigtail-db9',
          explanation: expect.stringContaining('cannot pass through'),
          evidence: expect.objectContaining({ state: 'builder_verified' }),
        }),
      ]),
    )
  })

  it('rejects duplicate IDs with both source files', async () => {
    const { authorCatalog, origins } = await loadAndValidateCatalog()
    const invalidCatalog = clone(authorCatalog)
    invalidCatalog.options[1].id = invalidCatalog.options[0].id

    expect(() =>
      validateCatalogSemantics(invalidCatalog, origins),
    ).toThrowError(/duplicate options ID.*first declared in/s)
  })

  it('rejects missing slot, asset, part, and capability references', async () => {
    const { authorCatalog, origins } = await loadAndValidateCatalog()
    const invalidCatalog = clone(authorCatalog)
    invalidCatalog.options[0].slot = 'missing_slot'
    invalidCatalog.options[0].assets = ['missing.asset']
    invalidCatalog.options[0].bom[0].part = 'missing.part'
    invalidCatalog.options[0].requires = ['missing:capability']

    let thrown
    try {
      validateCatalogSemantics(invalidCatalog, origins)
    } catch (error) {
      thrown = error
    }
    expect(thrown).toBeInstanceOf(CatalogValidationError)
    expect(thrown.issues).toEqual(
      expect.arrayContaining([
        expect.stringContaining('unknown slot ID "missing_slot"'),
        expect.stringContaining('unknown asset ID "missing.asset"'),
        expect.stringContaining('unknown part ID "missing.part"'),
        expect.stringContaining('unknown capability ID "missing:capability"'),
      ]),
    )
  })

  it('rejects non-positive BOM quantities and invalid evidence states by schema path', async () => {
    const { authorCatalog, origins } = await loadAndValidateCatalog()
    const schema = JSON.parse(
      await readFile(
        path.join(repositoryRoot, 'catalog/schema/catalog.schema.json'),
        'utf8',
      ),
    )
    const invalidCatalog = clone(authorCatalog)
    invalidCatalog.options[0].bom[0].quantity = 0
    invalidCatalog.options[0].evidence.state = 'probably'

    let thrown
    try {
      validateCatalogShape(invalidCatalog, origins, schema)
    } catch (error) {
      thrown = error
    }
    expect(thrown).toBeInstanceOf(CatalogValidationError)
    expect(thrown.issues).toEqual(
      expect.arrayContaining([
        expect.stringMatching(/catalog\/options\/.* \(bom\.0\.quantity\)/),
        expect.stringMatching(/catalog\/options\/.* \(evidence\.state\)/),
      ]),
    )
  })

  it('uses an actionable aggregate error type', () => {
    const error = new CatalogValidationError([
      'catalog/options/example.yaml: bad',
    ])
    expect(error.message).toContain('Catalog validation failed')
    expect(error.issues).toHaveLength(1)
  })
})

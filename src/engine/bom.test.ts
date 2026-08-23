import { describe, expect, it } from 'vitest'

import { aggregateBom } from './bom'
import type { EngineOffer, EngineOption, EnginePart } from './types'

const parts: EnginePart[] = [
  {
    id: 'part.bolt',
    label: 'M3 bolt',
    kind: 'fastener',
    defaultUnit: 'each',
  },
  {
    id: 'part.wire',
    label: 'Hook-up wire',
    kind: 'electrical',
    defaultUnit: 'meter',
  },
]

const options: EngineOption[] = [
  {
    id: 'option.base',
    slotId: 'base',
    bom: [
      {
        partId: 'part.bolt',
        quantity: 2,
        reason: 'Secures the base.',
      },
      {
        partId: 'part.wire',
        quantity: 1.5,
        reason: 'Connects the controller.',
      },
    ],
  },
  {
    id: 'option.mount',
    slotId: 'mount',
    bom: [
      {
        partId: 'part.bolt',
        quantity: 3,
        reason: 'Secures the mount.',
      },
    ],
  },
]

const offers: EngineOffer[] = [
  {
    id: 'offer.bolts.old',
    partId: 'part.bolt',
    vendor: 'Vendor A',
    region: 'CN',
    currency: 'CNY',
    packageQuantity: 10,
    packagePrice: 9,
    updatedAt: '2026-01-01',
  },
  {
    id: 'offer.bolts.current',
    partId: 'part.bolt',
    vendor: 'Vendor A',
    region: 'CN',
    currency: 'CNY',
    packageQuantity: 10,
    packagePrice: 8,
    updatedAt: '2026-08-23',
  },
]

describe('BOM aggregation', () => {
  it('aggregates by stable part and unit while retaining complete provenance', () => {
    const result = aggregateBom({
      options,
      parts,
      offers,
      priceContext: { region: 'CN', currency: 'CNY' },
      selection: { mount: 'option.mount', base: 'option.base' },
    })

    expect(result.lines[0]).toMatchObject({
      partId: 'part.bolt',
      quantity: 5,
      unit: 'each',
      contributors: ['option.base', 'option.mount'],
      reasons: [
        {
          optionId: 'option.base',
          quantity: 2,
          reason: 'Secures the base.',
        },
        {
          optionId: 'option.mount',
          quantity: 3,
          reason: 'Secures the mount.',
        },
      ],
      price: {
        complete: true,
        offerId: 'offer.bolts.current',
        packageCount: 1,
        amount: 8,
      },
    })
  })

  it('removes only an unselected option contribution', () => {
    const before = aggregateBom({
      options,
      parts,
      selection: { base: 'option.base', mount: 'option.mount' },
    })
    const after = aggregateBom({
      options,
      parts,
      selection: { base: 'option.base' },
    })

    expect(
      before.lines.find((line) => line.partId === 'part.bolt')?.quantity,
    ).toBe(5)
    expect(
      after.lines.find((line) => line.partId === 'part.bolt'),
    ).toMatchObject({
      quantity: 2,
      contributors: ['option.base'],
    })
    expect(
      after.lines.find((line) => line.partId === 'part.wire')?.quantity,
    ).toBe(1.5)
  })

  it('keeps units as an aggregation boundary', () => {
    const result = aggregateBom({
      options: [
        {
          id: 'option.mixed-units',
          slotId: 'test',
          bom: [
            { partId: 'part.wire', quantity: 2, unit: 'meter', reason: 'Run' },
            {
              partId: 'part.wire',
              quantity: 1,
              unit: 'spool',
              reason: 'Spare',
            },
          ],
        },
      ],
      parts,
      selection: { test: 'option.mixed-units' },
    })

    expect(
      result.lines.map(({ quantity, unit }) => ({ quantity, unit })),
    ).toEqual([
      { quantity: 2, unit: 'meter' },
      { quantity: 1, unit: 'spool' },
    ])
  })

  it('marks an unknown offer as incomplete and never substitutes a zero total', () => {
    const result = aggregateBom({
      options,
      parts,
      offers,
      priceContext: { region: 'CN', currency: 'CNY' },
      selection: { base: 'option.base' },
    })

    expect(
      result.lines.find((line) => line.partId === 'part.wire')?.price,
    ).toEqual({
      complete: false,
    })
    expect(result.price).toMatchObject({
      complete: false,
      currency: 'CNY',
      missingOfferLines: ['part.wire@meter'],
    })
    expect(result.price.total).toBeUndefined()
  })

  it('reports missing part identity as physical incompleteness', () => {
    const result = aggregateBom({
      options: [
        {
          id: 'option.orphan',
          slotId: 'test',
          bom: [{ partId: 'part.missing', quantity: 1, reason: 'Required' }],
        },
      ],
      selection: { test: 'option.orphan' },
    })

    expect(result.physicalComplete).toBe(false)
    expect(result.missingPartIds).toEqual(['part.missing'])
  })

  it('prices an empty BOM as a genuinely complete zero-cost boundary', () => {
    const result = aggregateBom({ options, parts, selection: {} })

    expect(result.lines).toEqual([])
    expect(result.price).toEqual({
      complete: true,
      currency: undefined,
      total: 0,
      missingOfferLines: [],
      issues: [],
    })
  })
})

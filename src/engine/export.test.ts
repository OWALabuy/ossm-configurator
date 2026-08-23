import { describe, expect, it } from 'vitest'

import {
  createConfigurationExport,
  serializeConfigurationExport,
} from './export'
import type { EngineOption, EnginePart } from './types'

const parts: EnginePart[] = [
  { id: 'part.shared', label: 'Shared part', defaultUnit: 'each' },
]

const warning = {
  id: 'warning.current-sense',
  severity: 'critical' as const,
  message: 'Required current sensing is not selected.',
  evidence: {
    state: 'repository_verified' as const,
    notes: 'The firmware reads a current-sense input during homing.',
    sources: [],
  },
}

const optionA: EngineOption = {
  id: 'option.a',
  slotId: 'slot.a',
  provides: ['cap:a'],
  bom: [{ partId: 'part.shared', quantity: 1, reason: 'Needed by A' }],
}

const optionB: EngineOption = {
  id: 'option.b',
  slotId: 'slot.b',
  provides: ['cap:b'],
  bom: [{ partId: 'part.shared', quantity: 2, reason: 'Needed by B' }],
  warnings: [warning],
}

describe('configuration export', () => {
  it('includes versions, source SHA, safety evidence, and BOM provenance', () => {
    const result = createConfigurationExport({
      schemaVersion: '1',
      catalogVersion: '2026.08',
      hardwareSource: {
        repository: 'ossm-hardware',
        commit: 'fb6f6d616b67528b41445f1dabdab6e6a4a605a8',
      },
      options: [optionA, optionB],
      parts,
      selection: { 'slot.a': 'option.a', 'slot.b': 'option.b' },
    })

    expect(result).toMatchObject({
      schemaVersion: '1',
      catalogVersion: '2026.08',
      hardwareSource: {
        commit: 'fb6f6d616b67528b41445f1dabdab6e6a4a605a8',
      },
      selections: [
        { slotId: 'slot.a', optionIds: ['option.a'] },
        { slotId: 'slot.b', optionIds: ['option.b'] },
      ],
      bom: {
        lines: [
          {
            partId: 'part.shared',
            quantity: 3,
            contributors: ['option.a', 'option.b'],
          },
        ],
      },
      warnings: [{ ...warning, optionId: 'option.b' }],
    })
  })

  it('serializes deterministically regardless of catalog and selection order', () => {
    const common = {
      schemaVersion: '1',
      catalogVersion: '2026.08',
      hardwareSource: {
        repository: 'ossm-hardware',
        commit: 'abc123',
      },
      parts,
    }
    const first = createConfigurationExport({
      ...common,
      options: [optionA, optionB],
      selection: { 'slot.b': 'option.b', 'slot.a': 'option.a' },
    })
    const second = createConfigurationExport({
      ...common,
      options: [optionB, optionA],
      selection: { 'slot.a': ['option.a'], 'slot.b': ['option.b'] },
    })

    expect(serializeConfigurationExport(first)).toBe(
      serializeConfigurationExport(second),
    )
  })
})

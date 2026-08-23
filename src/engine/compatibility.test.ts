import { describe, expect, it } from 'vitest'

import { evaluateCandidate, resolveCompatibility } from './compatibility'
import type { EngineOption } from './types'

const evidence = {
  state: 'builder_verified' as const,
  notes: 'Observed on the physical assembly.',
  sources: [],
}

const options: EngineOption[] = [
  {
    id: 'motor.pigtail',
    slotId: 'motor',
    provides: ['motor.frame:57', 'motor.interface:pigtail'],
  },
  {
    id: 'motor.passable',
    slotId: 'motor',
    provides: ['motor.frame:57', 'motor.rear:ring-passable'],
  },
  {
    id: 'mount.middle',
    slotId: 'mount',
    requires: ['motor.frame:57'],
  },
  {
    id: 'mount.ring',
    slotId: 'mount',
    requires: ['motor.frame:57', 'motor.rear:ring-passable'],
    conflicts: [
      {
        capability: 'motor.interface:pigtail',
        explanation: 'The captive tail cannot pass through the ring.',
        evidence,
      },
    ],
  },
]

describe('compatibility resolver', () => {
  it('returns structured missing capabilities, conflicts, explanations, and evidence', () => {
    const result = evaluateCandidate({
      options,
      selection: { motor: 'motor.pigtail' },
      candidateId: 'mount.ring',
    })

    expect(result.valid).toBe(false)
    expect(result.missing).toEqual(['motor.rear:ring-passable'])
    expect(result.conflicts).toEqual(['motor.interface:pigtail'])
    expect(result.explanations).toEqual([
      {
        kind: 'capability_conflict',
        optionId: 'mount.ring',
        capability: 'motor.interface:pigtail',
        message: 'The captive tail cannot pass through the ring.',
        evidence,
      },
      {
        kind: 'missing_requirement',
        optionId: 'mount.ring',
        capability: 'motor.rear:ring-passable',
        message: 'mount.ring requires capability motor.rear:ring-passable.',
      },
    ])
  })

  it('replaces the candidate slot and recomputes availability at the boundary', () => {
    const result = evaluateCandidate({
      options,
      selection: {
        motor: 'motor.pigtail',
        mount: 'mount.ring',
      },
      candidateId: 'mount.middle',
    })

    expect(result.valid).toBe(true)
    expect(result.selectedOptionIds).toEqual(['motor.pigtail', 'mount.middle'])
    expect(result.selection).toEqual({
      motor: 'motor.pigtail',
      mount: ['mount.middle'],
    })
  })

  it('makes unknown selections and candidates actionable instead of dropping them', () => {
    const selected = resolveCompatibility({
      options,
      selection: { motor: 'motor.not-in-catalog' },
    })
    const candidate = evaluateCandidate({
      options,
      selection: {},
      candidateId: 'mount.not-in-catalog',
    })

    expect(selected.valid).toBe(false)
    expect(selected.unknownOptionIds).toEqual(['motor.not-in-catalog'])
    expect(candidate.valid).toBe(false)
    expect(candidate.explanations[0]?.kind).toBe('unknown_option')
  })

  it('treats an empty selection as a valid boundary case', () => {
    expect(resolveCompatibility({ options, selection: {} })).toMatchObject({
      valid: true,
      selectedOptionIds: [],
      provided: [],
      missing: [],
      conflicts: [],
      explanations: [],
    })
  })
})

import { describe, expect, it } from 'vitest'

import {
  evidenceTone,
  formatEvidenceState,
  formatMoney,
  shortCommit,
} from './presentation'

describe('presentation helpers', () => {
  it('keeps evidence wording distinct instead of relying on color', () => {
    expect(formatEvidenceState('builder_verified')).toBe('Builder verified')
    expect(formatEvidenceState('unresolved')).toBe('Unresolved')
    expect(evidenceTone('known_incorrect')).toBe('danger')
  })

  it('formats money and source revisions', () => {
    expect(formatMoney({ amount: 12.5, currency: 'USD' })).toContain('12.50')
    expect(shortCommit('fb6f6d616b67528b41445f1dabdab6e6a4a605a8')).toBe(
      'fb6f6d616',
    )
  })
})

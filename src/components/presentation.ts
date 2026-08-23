import type { EvidenceState, MoneyViewModel } from './view-models'

const evidenceLabels: Record<EvidenceState, string> = {
  builder_verified: 'Builder verified',
  repository_verified: 'Repository verified',
  expected: 'Expected — fit not verified',
  unresolved: 'Unresolved',
  deprecated: 'Deprecated',
  known_incorrect: 'Known incorrect',
}

export function formatEvidenceState(state: EvidenceState): string {
  return evidenceLabels[state]
}

export function evidenceTone(
  state: EvidenceState,
): 'positive' | 'neutral' | 'warning' | 'danger' {
  switch (state) {
    case 'builder_verified':
    case 'repository_verified':
      return 'positive'
    case 'expected':
    case 'unresolved':
      return 'warning'
    case 'deprecated':
    case 'known_incorrect':
      return 'danger'
    default:
      return 'neutral'
  }
}

export function formatMoney(value: MoneyViewModel): string {
  try {
    return new Intl.NumberFormat(undefined, {
      style: 'currency',
      currency: value.currency,
    }).format(value.amount)
  } catch {
    return `${value.amount.toFixed(2)} ${value.currency}`
  }
}

export function shortCommit(commit: string): string {
  return commit.length > 9 ? commit.slice(0, 9) : commit
}

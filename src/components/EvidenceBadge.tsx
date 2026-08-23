import { evidenceTone, formatEvidenceState } from './presentation'
import type { EvidenceViewModel } from './view-models'

interface EvidenceBadgeProps {
  evidence: EvidenceViewModel
  compact?: boolean
}

export function EvidenceBadge({
  evidence,
  compact = false,
}: EvidenceBadgeProps) {
  return (
    <span
      className={`evidence-badge evidence-badge--${evidenceTone(evidence.state)}`}
      title={evidence.notes}
    >
      <span className="evidence-badge__mark" aria-hidden="true" />
      {compact
        ? formatEvidenceState(evidence.state)
        : formatEvidenceState(evidence.state)}
    </span>
  )
}

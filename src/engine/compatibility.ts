import { selectCandidate, selectedOptionIds } from './selection'
import { compareText } from './ordering'
import type {
  CandidateCompatibilityResult,
  CapabilityRule,
  CapabilityRuleDetails,
  CompatibilityExplanation,
  CompatibilityResult,
  EngineOption,
  Evidence,
  Selection,
} from './types'

function compareExplanation(
  left: CompatibilityExplanation,
  right: CompatibilityExplanation,
): number {
  return (
    compareText(left.optionId, right.optionId) ||
    compareText(left.kind, right.kind) ||
    compareText(left.capability ?? '', right.capability ?? '') ||
    compareText(left.message, right.message)
  )
}

function ruleDetails(rule: CapabilityRule): CapabilityRuleDetails {
  return typeof rule === 'string' ? { capability: rule } : rule
}

function issueEvidence(
  rule: CapabilityRuleDetails,
  option: EngineOption,
): Evidence | undefined {
  return rule.evidence ?? option.evidence
}

export interface ResolveCompatibilityInput {
  readonly options: readonly EngineOption[]
  readonly selection: Selection
}

export function resolveCompatibility({
  options,
  selection,
}: ResolveCompatibilityInput): CompatibilityResult {
  const optionById = new Map(options.map((option) => [option.id, option]))
  const selectedIds = selectedOptionIds(selection)
  const selectedOptions = selectedIds
    .map((id) => optionById.get(id))
    .filter((option): option is EngineOption => option !== undefined)
    .sort((left, right) => compareText(left.id, right.id))
  const unknownOptionIds = selectedIds.filter((id) => !optionById.has(id))
  const provided = [
    ...new Set(selectedOptions.flatMap((option) => option.provides ?? [])),
  ].sort(compareText)
  const providedSet = new Set(provided)
  const explanations: CompatibilityExplanation[] = unknownOptionIds.map(
    (optionId) => ({
      kind: 'unknown_option',
      optionId,
      message: `Selected option "${optionId}" does not exist in the catalog.`,
    }),
  )
  const missing = new Set<string>()
  const conflicts = new Set<string>()

  for (const option of selectedOptions) {
    for (const rawRule of option.requires ?? []) {
      const rule = ruleDetails(rawRule)
      if (providedSet.has(rule.capability)) continue

      missing.add(rule.capability)
      explanations.push({
        kind: 'missing_requirement',
        optionId: option.id,
        capability: rule.capability,
        message:
          rule.explanation ??
          `${option.id} requires capability ${rule.capability}.`,
        evidence: issueEvidence(rule, option),
      })
    }

    for (const rawRule of option.conflicts ?? []) {
      const rule = ruleDetails(rawRule)
      if (!providedSet.has(rule.capability)) continue

      conflicts.add(rule.capability)
      explanations.push({
        kind: 'capability_conflict',
        optionId: option.id,
        capability: rule.capability,
        message:
          rule.explanation ??
          `${option.id} conflicts with capability ${rule.capability}.`,
        evidence: issueEvidence(rule, option),
      })
    }
  }

  explanations.sort(compareExplanation)

  return {
    valid: explanations.length === 0,
    selectedOptionIds: selectedIds,
    provided,
    missing: [...missing].sort(compareText),
    conflicts: [...conflicts].sort(compareText),
    unknownOptionIds,
    explanations,
  }
}

export interface EvaluateCandidateInput extends ResolveCompatibilityInput {
  readonly candidateId: string
  readonly mode?: 'replace' | 'append'
}

export function evaluateCandidate({
  options,
  selection,
  candidateId,
  mode = 'replace',
}: EvaluateCandidateInput): CandidateCompatibilityResult {
  const candidate = options.find((option) => option.id === candidateId)

  if (candidate === undefined) {
    const result = resolveCompatibility({ options, selection })
    const unknownExplanation: CompatibilityExplanation = {
      kind: 'unknown_option',
      optionId: candidateId,
      message: `Candidate option "${candidateId}" does not exist in the catalog.`,
    }

    return {
      ...result,
      candidateId,
      valid: false,
      unknownOptionIds: [
        ...new Set([...result.unknownOptionIds, candidateId]),
      ].sort(compareText),
      explanations: [...result.explanations, unknownExplanation].sort(
        compareExplanation,
      ),
      selection,
    }
  }

  const candidateSelection = selectCandidate(selection, candidate, mode)
  return {
    ...resolveCompatibility({ options, selection: candidateSelection }),
    candidateId,
    selection: candidateSelection,
  }
}

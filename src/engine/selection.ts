import type { EngineOption, NormalizedSelectionEntry, Selection } from './types'
import { compareText } from './ordering'

function optionIds(value: Selection[string]): string[] {
  if (typeof value === 'string') {
    return value.length === 0 ? [] : [value]
  }

  return value == null ? [] : [...value].filter((id) => id.length > 0)
}

export function normalizeSelection(
  selection: Selection,
): NormalizedSelectionEntry[] {
  return Object.entries(selection)
    .map(([slotId, value]) => ({
      slotId,
      optionIds: [...new Set(optionIds(value))].sort(compareText),
    }))
    .filter(({ optionIds: ids }) => ids.length > 0)
    .sort((left, right) => compareText(left.slotId, right.slotId))
}

export function selectedOptionIds(selection: Selection): string[] {
  return [
    ...new Set(
      normalizeSelection(selection).flatMap(({ optionIds: ids }) => ids),
    ),
  ].sort(compareText)
}

export function selectCandidate(
  selection: Selection,
  candidate: Pick<EngineOption, 'id' | 'slotId'>,
  mode: 'replace' | 'append' = 'replace',
): Selection {
  const current =
    mode === 'append' ? optionIds(selection[candidate.slotId]) : []

  return {
    ...selection,
    [candidate.slotId]: [...new Set([...current, candidate.id])].sort(
      compareText,
    ),
  }
}

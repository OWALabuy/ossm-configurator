import { aggregateBom } from './bom'
import { resolveCompatibility } from './compatibility'
import { normalizeSelection, selectedOptionIds } from './selection'
import { compareText } from './ordering'
import type {
  ConfigurationExport,
  EngineOffer,
  EngineOption,
  EnginePart,
  ExportWarning,
  HardwareSource,
  PriceContext,
  SafetyWarning,
  Selection,
} from './types'

export interface CreateConfigurationExportInput {
  readonly schemaVersion: string | number
  readonly catalogVersion: string
  readonly hardwareSource: HardwareSource
  readonly options: readonly EngineOption[]
  readonly parts?: readonly EnginePart[]
  readonly offers?: readonly EngineOffer[]
  readonly priceContext?: PriceContext
  readonly selection: Selection
  readonly warnings?: readonly SafetyWarning[]
}

function warningKey(warning: ExportWarning): string {
  return [
    warning.optionId ?? '',
    warning.id,
    warning.severity,
    warning.message,
  ].join('\u0000')
}

function compareWarnings(left: ExportWarning, right: ExportWarning): number {
  return compareText(warningKey(left), warningKey(right))
}

function selectedWarnings(
  options: readonly EngineOption[],
  selection: Selection,
): ExportWarning[] {
  const optionById = new Map(options.map((option) => [option.id, option]))

  return selectedOptionIds(selection).flatMap((optionId) =>
    (optionById.get(optionId)?.warnings ?? []).map((warning) => ({
      ...warning,
      optionId,
    })),
  )
}

export function createConfigurationExport({
  schemaVersion,
  catalogVersion,
  hardwareSource,
  options,
  parts = [],
  offers = [],
  priceContext,
  selection,
  warnings = [],
}: CreateConfigurationExportInput): ConfigurationExport {
  const allWarnings: ExportWarning[] = [
    ...selectedWarnings(options, selection),
    ...warnings,
  ]
  const deduplicatedWarnings = [
    ...new Map(
      allWarnings.map((warning) => [warningKey(warning), warning]),
    ).values(),
  ].sort(compareWarnings)

  return {
    schemaVersion,
    catalogVersion,
    hardwareSource: {
      repository: hardwareSource.repository,
      commit: hardwareSource.commit,
    },
    selections: normalizeSelection(selection),
    compatibility: resolveCompatibility({ options, selection }),
    bom: aggregateBom({
      options,
      selection,
      parts,
      offers,
      priceContext,
    }),
    warnings: deduplicatedWarnings,
  }
}

function stableValue(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(stableValue)

  if (value !== null && typeof value === 'object') {
    return Object.fromEntries(
      Object.entries(value)
        .filter(([, entry]) => entry !== undefined)
        .sort(([left], [right]) => compareText(left, right))
        .map(([key, entry]) => [key, stableValue(entry)]),
    )
  }

  return value
}

/** Serialize without timestamps or insertion-order dependence. */
export function serializeConfigurationExport(
  configuration: ConfigurationExport,
): string {
  return JSON.stringify(stableValue(configuration), null, 2)
}

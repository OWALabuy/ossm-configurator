import type {
  BomContribution as CatalogBomContribution,
  CatalogWarning,
  Evidence as CatalogEvidence,
  EvidenceState as CatalogEvidenceState,
  HardwareSource as CatalogHardwareSource,
  WarningSeverity as CatalogWarningSeverity,
} from '../catalog/types'

export type EvidenceState = CatalogEvidenceState
export type Evidence = CatalogEvidence

export interface CapabilityRuleDetails {
  readonly capability: string
  readonly explanation?: string
  readonly evidence?: Evidence
}

export type CapabilityRule = string | CapabilityRuleDetails

export type BomContribution = CatalogBomContribution

export type WarningSeverity = CatalogWarningSeverity

export type SafetyWarning = CatalogWarning

/**
 * The deliberately narrow option shape consumed by the engine. A normalized
 * catalog option is structurally compatible with this interface.
 */
export interface EngineOption {
  readonly id: string
  readonly slotId: string
  readonly provides?: readonly string[]
  readonly requires?: readonly CapabilityRule[]
  readonly conflicts?: readonly CapabilityRule[]
  readonly bom?: readonly BomContribution[]
  readonly evidence?: Evidence
  readonly warnings?: readonly SafetyWarning[]
}

export interface EnginePart {
  readonly id: string
  readonly label?: string
  readonly kind?: string
  readonly defaultUnit: string
}

export interface EngineOffer {
  readonly id: string
  readonly partId: string
  readonly vendor: string
  readonly region: string
  readonly currency: string
  readonly packageQuantity: number
  readonly packagePrice: number
  readonly updatedAt: string
  readonly url?: string
  /** The unit represented by packageQuantity. Defaults to the part unit. */
  readonly unit?: string
}

export type SelectionValue = string | readonly string[] | null | undefined

/** Slot IDs are keys; option IDs are values. Arrays support multi-cardinality slots. */
export type Selection = Readonly<Record<string, SelectionValue>>

export interface NormalizedSelectionEntry {
  readonly slotId: string
  readonly optionIds: readonly string[]
}

export type CompatibilityIssueKind =
  'missing_requirement' | 'capability_conflict' | 'unknown_option'

export interface CompatibilityExplanation {
  readonly kind: CompatibilityIssueKind
  readonly optionId: string
  readonly capability?: string
  readonly message: string
  readonly evidence?: Evidence
}

export interface CompatibilityResult {
  readonly valid: boolean
  readonly selectedOptionIds: readonly string[]
  readonly provided: readonly string[]
  readonly missing: readonly string[]
  readonly conflicts: readonly string[]
  readonly unknownOptionIds: readonly string[]
  readonly explanations: readonly CompatibilityExplanation[]
}

export interface CandidateCompatibilityResult extends CompatibilityResult {
  readonly candidateId: string
  readonly selection: Selection
}

export interface BomReason {
  readonly optionId: string
  readonly reason: string
  readonly quantity: number
}

export interface BomLinePrice {
  readonly complete: boolean
  readonly offerId?: string
  readonly vendor?: string
  readonly region?: string
  readonly currency?: string
  readonly packageCount?: number
  readonly amount?: number
}

export interface AggregatedBomLine {
  readonly partId: string
  readonly label?: string
  readonly kind?: string
  readonly quantity: number
  readonly unit: string
  readonly contributors: readonly string[]
  readonly reasons: readonly BomReason[]
  readonly price: BomLinePrice
}

export interface PriceContext {
  readonly region?: string
  readonly currency?: string
  readonly vendor?: string
}

export interface BomPriceSummary {
  readonly complete: boolean
  readonly currency?: string
  /** Undefined whenever the estimate is incomplete. */
  readonly total?: number
  readonly missingOfferLines: readonly string[]
  readonly issues: readonly 'mixed_currencies'[]
}

export interface BomResult {
  readonly lines: readonly AggregatedBomLine[]
  readonly missingOptionIds: readonly string[]
  readonly missingPartIds: readonly string[]
  readonly physicalComplete: boolean
  readonly price: BomPriceSummary
}

export type HardwareSource = CatalogHardwareSource

export interface ExportWarning extends SafetyWarning {
  readonly optionId?: string
}

export interface ConfigurationExport {
  readonly schemaVersion: string | number
  readonly catalogVersion: string
  readonly hardwareSource: HardwareSource
  readonly selections: readonly NormalizedSelectionEntry[]
  readonly compatibility: CompatibilityResult
  readonly bom: BomResult
  readonly warnings: readonly ExportWarning[]
}

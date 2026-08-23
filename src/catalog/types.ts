export type EntityId = string
export type CapabilityId = string
export type OptionId = EntityId
export type SlotId = EntityId
export type PartId = EntityId
export type AssetId = EntityId

export type EvidenceState =
  | 'builder_verified'
  | 'repository_verified'
  | 'expected'
  | 'unresolved'
  | 'deprecated'
  | 'known_incorrect'

export type EvidenceSourceKind =
  'project_document' | 'repository' | 'field_observation'

export interface EvidenceSource {
  kind: EvidenceSourceKind
  path?: string
  commit?: string
  note?: string
}

export interface Evidence {
  state: EvidenceState
  notes: string
  sources: EvidenceSource[]
}

export interface Capability {
  id: CapabilityId
  label: string
  description: string
}

export type SlotCardinality = 'one' | 'zero_or_one'

export interface Slot {
  id: SlotId
  label: string
  description: string
  cardinality: SlotCardinality
  order: number
}

export type OptionStatus =
  'supported' | 'experimental' | 'unresolved' | 'deprecated'

export type WarningSeverity = 'info' | 'warning' | 'critical'

export interface CatalogWarning {
  id: EntityId
  severity: WarningSeverity
  message: string
  evidence: Evidence
}

export interface BomContribution {
  partId: PartId
  quantity: number
  unit?: string
  reason: string
}

export interface CapabilityRule {
  capability: CapabilityId
  explanation: string
  evidence?: Evidence
}

export type CapabilityConstraint = CapabilityId | CapabilityRule

export interface Option {
  id: OptionId
  slotId: SlotId
  label: string
  description?: string
  status: OptionStatus
  provides: CapabilityId[]
  requires: CapabilityConstraint[]
  conflicts: CapabilityConstraint[]
  assetIds: AssetId[]
  bom: BomContribution[]
  evidence: Evidence
  warnings: CatalogWarning[]
}

export interface Part {
  id: PartId
  label: string
  kind: string
  specification: Record<string, string | number | boolean>
  defaultUnit: string
  evidence: Evidence
}

export interface Offer {
  id: EntityId
  partId: PartId
  vendor: string
  region: string
  currency: string
  packageQuantity: number
  packagePrice: number
  updatedAt: string
  url?: string
}

export interface AssetSource {
  repository: string
  path: string
  commit: string
}

export interface GeneratedAsset {
  /** URL relative to Vite's BASE_URL. */
  url: string
  contentHash: `sha256:${string}`
}

export interface CatalogAsset {
  id: AssetId
  role: 'preview'
  format: 'stl' | 'glb'
  source: AssetSource
  generated?: GeneratedAsset
}

export interface HardwareSource {
  repository: string
  commit: string
}

export interface Catalog {
  schemaVersion: 1
  catalogVersion: string
  hardwareSource: HardwareSource
  capabilities: Capability[]
  slots: Slot[]
  options: Option[]
  parts: Part[]
  offers: Offer[]
  assets: CatalogAsset[]
}

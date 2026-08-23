/**
 * Presentation-only types used by the generic configurator UI.
 *
 * The catalog and engine layers deliberately map into these types rather than
 * teaching React about any OSSM slot or option IDs.
 */
export type EvidenceState =
  | 'builder_verified'
  | 'repository_verified'
  | 'expected'
  | 'unresolved'
  | 'deprecated'
  | 'known_incorrect'

export interface EvidenceViewModel {
  state: EvidenceState
  notes?: string
}

export interface CompatibilityReasonViewModel {
  message: string
  evidence?: EvidenceViewModel
}

export interface OptionViewModel {
  id: string
  label: string
  description?: string
  status?: string
  evidence?: EvidenceViewModel
  selectable: boolean
  reasons: CompatibilityReasonViewModel[]
  priceDelta?: MoneyViewModel
}

export interface SlotViewModel {
  id: string
  label: string
  description?: string
  required: boolean
  options: OptionViewModel[]
}

export interface SourceRevisionViewModel {
  repository: string
  commit: string
  dirty?: boolean
}

export type PreviewModelViewModel =
  | {
      status: 'available'
      url: string
      sourcePath?: string
      sourceCommit?: string
      contentHash?: string
    }
  | {
      status: 'missing'
      reason: string
      sourcePath?: string
      sourceCommit?: string
    }

export interface MoneyViewModel {
  amount: number
  currency: string
}

export interface BomContributorViewModel {
  id: string
  label?: string
}

export interface BomPriceViewModel {
  lineTotal: MoneyViewModel
  vendor?: string
  updatedAt?: string
  stale?: boolean
}

export interface BomLineViewModel {
  partId: string
  label: string
  quantity: number
  unit: string
  contributors: BomContributorViewModel[]
  price?: BomPriceViewModel
}

export interface BomViewModel {
  lines: BomLineViewModel[]
  totals: MoneyViewModel[]
  incompletePricePartIds: string[]
}

export interface ConfigurationNoticeViewModel {
  id: string
  severity: 'info' | 'warning' | 'error'
  title: string
  message: string
  evidence?: EvidenceViewModel
}

export type CatalogStateViewModel =
  | { status: 'loading'; message?: string }
  | {
      status: 'invalid'
      title?: string
      issues: Array<{ path?: string; message: string }>
    }
  | { status: 'ready'; catalogVersion: string }

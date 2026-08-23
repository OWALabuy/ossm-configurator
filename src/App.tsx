import { BomPanel } from './components/BomPanel'
import { ConfigurationNotices } from './components/ConfigurationNotices'
import { SelectionPanel } from './components/SelectionPanel'
import { shortCommit } from './components/presentation'
import type {
  BomViewModel,
  CatalogStateViewModel,
  ConfigurationNoticeViewModel,
  PreviewModelViewModel,
  SlotViewModel,
  SourceRevisionViewModel,
} from './components/view-models'
import { PartViewer } from './scene/PartViewer'
import './styles.css'

export interface ConfiguratorAppProps {
  catalogState: CatalogStateViewModel
  slots?: SlotViewModel[]
  selectedBySlot?: Readonly<Record<string, string | undefined>>
  preview?: {
    title?: string
    model: PreviewModelViewModel | null
  }
  bom?: BomViewModel
  notices?: ConfigurationNoticeViewModel[]
  sourceRevision?: SourceRevisionViewModel
  onSelect?: (slotId: string, optionId: string) => void
  onClear?: (slotId: string) => void
  onExport?: () => void
  exportDisabledReason?: string
}

const emptyBom: BomViewModel = {
  lines: [],
  totals: [],
  incompletePricePartIds: [],
}

export default function App({
  catalogState,
  slots = [],
  selectedBySlot = {},
  preview = { model: null },
  bom = emptyBom,
  notices = [],
  sourceRevision,
  onSelect = () => undefined,
  onClear,
  onExport,
  exportDisabledReason,
}: ConfiguratorAppProps) {
  if (catalogState.status === 'loading') {
    return (
      <ApplicationFrame sourceRevision={sourceRevision}>
        <main className="application-state" aria-busy="true">
          <span className="application-state__spinner" aria-hidden="true" />
          <p className="eyebrow">Catalog</p>
          <h1>Preparing the configurator</h1>
          <p>
            {catalogState.message ??
              'Validating catalog records and preparing referenced assets…'}
          </p>
        </main>
      </ApplicationFrame>
    )
  }

  if (catalogState.status === 'invalid') {
    return (
      <ApplicationFrame sourceRevision={sourceRevision}>
        <main className="application-state application-state--error">
          <span className="application-state__error-mark" aria-hidden="true">
            !
          </span>
          <p className="eyebrow">Catalog error</p>
          <h1>{catalogState.title ?? 'The catalog could not be loaded'}</h1>
          <p>
            Fix the following records and rebuild. Invalid data is never hidden
            from the interface.
          </p>
          <ul className="catalog-issues">
            {catalogState.issues.map((issue, index) => (
              <li key={`${issue.path ?? 'catalog'}:${index}`}>
                {issue.path && <code>{issue.path}</code>}
                <span>{issue.message}</span>
              </li>
            ))}
          </ul>
        </main>
      </ApplicationFrame>
    )
  }

  const hasInvalidSelection = slots.some((slot) => {
    const selectedId = selectedBySlot[slot.id]
    if (!selectedId) return slot.required
    const selectedOption = slot.options.find(
      (option) => option.id === selectedId,
    )
    return !selectedOption || !selectedOption.selectable
  })
  const canExport = !hasInvalidSelection && onExport !== undefined

  return (
    <ApplicationFrame
      sourceRevision={sourceRevision}
      catalogVersion={catalogState.catalogVersion}
    >
      <main className="configurator-layout">
        <SelectionPanel
          slots={slots}
          selectedBySlot={selectedBySlot}
          onSelect={onSelect}
          onClear={onClear}
        />
        <div className="preview-column">
          <PartViewer title={preview.title} model={preview.model} />
          <ConfigurationNotices notices={notices} />
        </div>
        <BomPanel
          bom={bom}
          canExport={canExport}
          exportDisabledReason={
            exportDisabledReason ??
            (hasInvalidSelection
              ? 'Complete all required areas and resolve incompatible selections before exporting.'
              : 'Export is not available.')
          }
          onExport={onExport ?? (() => undefined)}
        />
      </main>
    </ApplicationFrame>
  )
}

function ApplicationFrame({
  sourceRevision,
  catalogVersion,
  children,
}: {
  sourceRevision?: SourceRevisionViewModel
  catalogVersion?: string
  children: React.ReactNode
}) {
  return (
    <div className="app-shell">
      <header className="app-header">
        <a className="brand" href="./" aria-label="OSSM Configurator home">
          <span className="brand__mark" aria-hidden="true">
            O
          </span>
          <span>
            <strong>OSSM</strong>
            <small>CONFIGURATOR</small>
          </span>
        </a>
        <div className="build-provenance" aria-label="Build provenance">
          {catalogVersion && <span>Catalog {catalogVersion}</span>}
          {sourceRevision ? (
            <span>
              {sourceRevision.repository}{' '}
              <code>{shortCommit(sourceRevision.commit)}</code>
              {sourceRevision.dirty && (
                <strong className="dirty-source">dirty source</strong>
              )}
            </span>
          ) : (
            <span>Source revision unavailable</span>
          )}
        </div>
      </header>
      {children}
    </div>
  )
}

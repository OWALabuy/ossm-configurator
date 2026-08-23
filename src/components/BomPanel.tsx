import { formatMoney } from './presentation'
import type { BomLineViewModel, BomViewModel } from './view-models'

export interface BomPanelProps {
  bom: BomViewModel
  canExport: boolean
  exportDisabledReason?: string
  onExport: () => void
}

export function BomPanel({
  bom,
  canExport,
  exportDisabledReason,
  onExport,
}: BomPanelProps) {
  const incompleteCount = bom.incompletePricePartIds.length

  return (
    <aside className="panel bom-panel" aria-labelledby="bom-heading">
      <header className="panel__heading">
        <div>
          <p className="eyebrow">Procurement</p>
          <h2 id="bom-heading">Configuration BOM</h2>
        </div>
        <span className="bom-panel__count">
          {bom.lines.length} {bom.lines.length === 1 ? 'line' : 'lines'}
        </span>
      </header>

      {bom.lines.length === 0 ? (
        <div className="empty-state empty-state--compact">
          <p className="empty-state__title">Nothing in the BOM yet</p>
          <p>
            Select components to see their configuration-specific contributions.
          </p>
        </div>
      ) : (
        <div className="bom-lines">
          {bom.lines.map((line) => (
            <BomLine key={`${line.partId}:${line.unit}`} line={line} />
          ))}
        </div>
      )}

      <div className="bom-summary" aria-live="polite">
        <div>
          <span>Estimated total</span>
          <strong>
            {bom.totals.length === 0
              ? 'No priced parts'
              : bom.totals.map(formatMoney).join(' + ')}
          </strong>
        </div>
        {incompleteCount > 0 ? (
          <p className="price-warning">
            <span aria-hidden="true">!</span>
            Pricing incomplete for {incompleteCount}{' '}
            {incompleteCount === 1 ? 'part' : 'parts'}. Missing prices are not
            counted as zero.
          </p>
        ) : bom.lines.length > 0 ? (
          <p className="price-complete">All BOM lines have a price offer.</p>
        ) : null}
      </div>

      <div className="export-block">
        <button
          className="primary-button"
          type="button"
          disabled={!canExport}
          onClick={onExport}
        >
          Export configuration JSON
        </button>
        <p>
          {canExport
            ? 'Includes BOM provenance and source revision.'
            : exportDisabledReason}
        </p>
      </div>
    </aside>
  )
}

function BomLine({ line }: { line: BomLineViewModel }) {
  return (
    <article className="bom-line">
      <div className="bom-line__topline">
        <div>
          <h3>{line.label}</h3>
          <code>{line.partId}</code>
        </div>
        <strong className="bom-line__quantity">
          {line.quantity} <span>{line.unit}</span>
        </strong>
      </div>
      <div className="bom-line__provenance">
        <span>Added by</span>
        <ul aria-label={`Contributors for ${line.label}`}>
          {line.contributors.map((contributor) => (
            <li key={contributor.id} title={contributor.id}>
              {contributor.label ?? contributor.id}
            </li>
          ))}
        </ul>
      </div>
      <div className="bom-line__price">
        {line.price ? (
          <>
            <span>
              {formatMoney(line.price.lineTotal)}
              {line.price.vendor ? ` · ${line.price.vendor}` : ''}
            </span>
            {line.price.stale && (
              <span className="stale-price">Offer may be stale</span>
            )}
          </>
        ) : (
          <span className="unknown-price">Price unavailable</span>
        )}
      </div>
    </article>
  )
}

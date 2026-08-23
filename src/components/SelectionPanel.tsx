import { EvidenceBadge } from './EvidenceBadge'
import { formatMoney } from './presentation'
import type { SlotViewModel } from './view-models'

export interface SelectionPanelProps {
  slots: SlotViewModel[]
  selectedBySlot: Readonly<Record<string, string | undefined>>
  onSelect: (slotId: string, optionId: string) => void
  onClear?: (slotId: string) => void
}

export function SelectionPanel({
  slots,
  selectedBySlot,
  onSelect,
  onClear,
}: SelectionPanelProps) {
  if (slots.length === 0) {
    return (
      <section
        className="panel selection-panel"
        aria-labelledby="selection-heading"
      >
        <PanelHeading />
        <div className="empty-state empty-state--compact">
          <p className="empty-state__title">No assembly areas</p>
          <p>
            The catalog is valid, but it does not define any selectable slots.
          </p>
        </div>
      </section>
    )
  }

  return (
    <section
      className="panel selection-panel"
      aria-labelledby="selection-heading"
    >
      <PanelHeading />
      <div className="selection-panel__slots">
        {slots.map((slot, slotIndex) => {
          const selectedId = selectedBySlot[slot.id]
          return (
            <fieldset className="slot" key={slot.id}>
              <legend>
                <span className="slot__number" aria-hidden="true">
                  {String(slotIndex + 1).padStart(2, '0')}
                </span>
                <span>{slot.label}</span>
                {!slot.required && (
                  <span className="slot__optional">Optional</span>
                )}
              </legend>
              {slot.description && (
                <p className="slot__description">{slot.description}</p>
              )}
              <div className="option-list">
                {slot.options.length === 0 ? (
                  <p className="slot__empty">
                    No options are defined for this area.
                  </p>
                ) : (
                  slot.options.map((option) => {
                    const selected = option.id === selectedId
                    const descriptionId = `option-${toDomId(slot.id)}-${toDomId(option.id)}-details`
                    return (
                      <label
                        className={`option-card${selected ? ' option-card--selected' : ''}${
                          !option.selectable ? ' option-card--disabled' : ''
                        }`}
                        key={option.id}
                        aria-disabled={!option.selectable}
                      >
                        <input
                          type="radio"
                          name={`slot-${slot.id}`}
                          value={option.id}
                          checked={selected}
                          disabled={!option.selectable}
                          aria-describedby={descriptionId}
                          onChange={() => onSelect(slot.id, option.id)}
                        />
                        <span
                          className="option-card__control"
                          aria-hidden="true"
                        />
                        <span className="option-card__body">
                          <span className="option-card__heading">
                            <span className="option-card__label">
                              {option.label}
                            </span>
                            {option.priceDelta && (
                              <span className="option-card__price">
                                +{formatMoney(option.priceDelta)}
                              </span>
                            )}
                          </span>
                          <span
                            className="option-card__details"
                            id={descriptionId}
                          >
                            {option.description && (
                              <span className="option-card__description">
                                {option.description}
                              </span>
                            )}
                            {option.evidence && (
                              <EvidenceBadge
                                evidence={option.evidence}
                                compact
                              />
                            )}
                            {!option.selectable &&
                              option.reasons.length > 0 && (
                                <span
                                  className="compatibility-reasons"
                                  role="note"
                                >
                                  {option.reasons.map((reason, reasonIndex) => (
                                    <span
                                      className="compatibility-reason"
                                      key={reasonIndex}
                                    >
                                      <span aria-hidden="true">!</span>
                                      <span>
                                        {reason.message}
                                        {reason.evidence && (
                                          <EvidenceBadge
                                            evidence={reason.evidence}
                                            compact
                                          />
                                        )}
                                      </span>
                                    </span>
                                  ))}
                                </span>
                              )}
                          </span>
                        </span>
                      </label>
                    )
                  })
                )}
              </div>
              {!slot.required && selectedId && onClear && (
                <button
                  className="text-button slot__clear"
                  type="button"
                  onClick={() => onClear(slot.id)}
                >
                  Clear selection
                </button>
              )}
            </fieldset>
          )
        })}
      </div>
    </section>
  )
}

function PanelHeading() {
  return (
    <header className="panel__heading selection-panel__heading">
      <div>
        <p className="eyebrow">Assembly</p>
        <h2 id="selection-heading">Choose components</h2>
      </div>
      <span className="panel__hint">Unavailable choices stay visible</span>
    </header>
  )
}

function toDomId(id: string): string {
  return id.replace(/[^a-zA-Z0-9_-]/g, '-')
}

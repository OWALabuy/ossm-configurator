import { selectedOptionIds } from './selection'
import { compareText } from './ordering'
import type {
  AggregatedBomLine,
  BomLinePrice,
  BomReason,
  BomResult,
  EngineOffer,
  EngineOption,
  EnginePart,
  PriceContext,
  Selection,
} from './types'

const KEY_SEPARATOR = '\u0000'

interface MutableBomLine {
  partId: string
  label?: string
  kind?: string
  quantity: number
  unit: string
  contributors: Set<string>
  reasons: BomReason[]
}

export interface AggregateBomInput {
  readonly options: readonly EngineOption[]
  readonly selection: Selection
  readonly parts?: readonly EnginePart[]
  readonly offers?: readonly EngineOffer[]
  readonly priceContext?: PriceContext
}

function lineKey(partId: string, unit: string): string {
  return `${partId}${KEY_SEPARATOR}${unit}`
}

function publicLineKey(partId: string, unit: string): string {
  return `${partId}@${unit}`
}

function compareReasons(left: BomReason, right: BomReason): number {
  return (
    compareText(left.optionId, right.optionId) ||
    compareText(left.reason, right.reason) ||
    left.quantity - right.quantity
  )
}

function offerMatches(
  offer: EngineOffer,
  unit: string,
  partUnit: string,
  context: PriceContext,
): boolean {
  return (
    (offer.unit ?? partUnit) === unit &&
    (context.region === undefined || offer.region === context.region) &&
    (context.currency === undefined || offer.currency === context.currency) &&
    (context.vendor === undefined || offer.vendor === context.vendor) &&
    Number.isFinite(offer.packageQuantity) &&
    offer.packageQuantity > 0 &&
    Number.isFinite(offer.packagePrice) &&
    offer.packagePrice >= 0
  )
}

function chooseOffer(
  offers: readonly EngineOffer[],
  partId: string,
  unit: string,
  partUnit: string,
  context: PriceContext,
): EngineOffer | undefined {
  return offers
    .filter(
      (offer) =>
        offer.partId === partId && offerMatches(offer, unit, partUnit, context),
    )
    .sort(
      (left, right) =>
        compareText(right.updatedAt, left.updatedAt) ||
        compareText(left.id, right.id),
    )[0]
}

function priceLine(
  line: MutableBomLine,
  offers: readonly EngineOffer[],
  partUnit: string,
  context: PriceContext,
): BomLinePrice {
  const offer = chooseOffer(offers, line.partId, line.unit, partUnit, context)
  if (offer === undefined) return { complete: false }

  const packageCount = Math.ceil(line.quantity / offer.packageQuantity)
  return {
    complete: true,
    offerId: offer.id,
    vendor: offer.vendor,
    region: offer.region,
    currency: offer.currency,
    packageCount,
    amount: packageCount * offer.packagePrice,
  }
}

export function aggregateBom({
  options,
  selection,
  parts = [],
  offers = [],
  priceContext = {},
}: AggregateBomInput): BomResult {
  const optionById = new Map(options.map((option) => [option.id, option]))
  const partById = new Map(parts.map((part) => [part.id, part]))
  const ids = selectedOptionIds(selection)
  const missingOptionIds = ids.filter((id) => !optionById.has(id))
  const mutableLines = new Map<string, MutableBomLine>()

  for (const optionId of ids) {
    const option = optionById.get(optionId)
    if (option === undefined) continue

    for (const contribution of option.bom ?? []) {
      const part = partById.get(contribution.partId)
      const unit = contribution.unit ?? part?.defaultUnit ?? 'each'
      const key = lineKey(contribution.partId, unit)
      const existing = mutableLines.get(key)
      const reason: BomReason = {
        optionId,
        reason: contribution.reason,
        quantity: contribution.quantity,
      }

      if (existing === undefined) {
        mutableLines.set(key, {
          partId: contribution.partId,
          label: part?.label,
          kind: part?.kind,
          quantity: contribution.quantity,
          unit,
          contributors: new Set([optionId]),
          reasons: [reason],
        })
      } else {
        existing.quantity += contribution.quantity
        existing.contributors.add(optionId)
        existing.reasons.push(reason)
      }
    }
  }

  const missingPartIds = [
    ...new Set(
      [...mutableLines.values()]
        .filter((line) => !partById.has(line.partId))
        .map((line) => line.partId),
    ),
  ].sort(compareText)
  const lines: AggregatedBomLine[] = [...mutableLines.values()]
    .sort(
      (left, right) =>
        compareText(left.partId, right.partId) ||
        compareText(left.unit, right.unit),
    )
    .map((line) => {
      const partUnit = partById.get(line.partId)?.defaultUnit ?? line.unit
      return {
        partId: line.partId,
        label: line.label,
        kind: line.kind,
        quantity: line.quantity,
        unit: line.unit,
        contributors: [...line.contributors].sort(compareText),
        reasons: [...line.reasons].sort(compareReasons),
        price: priceLine(line, offers, partUnit, priceContext),
      }
    })
  const missingOfferLines = lines
    .filter((line) => !line.price.complete)
    .map((line) => publicLineKey(line.partId, line.unit))
  const currencies = [
    ...new Set(
      lines
        .map((line) => line.price.currency)
        .filter((currency): currency is string => currency !== undefined),
    ),
  ].sort(compareText)
  const mixedCurrencies = currencies.length > 1
  const priceComplete = missingOfferLines.length === 0 && !mixedCurrencies
  const currency =
    priceContext.currency ??
    (currencies.length === 1 ? currencies[0] : undefined)
  const total = priceComplete
    ? lines.reduce((sum, line) => sum + (line.price.amount ?? 0), 0)
    : undefined

  return {
    lines,
    missingOptionIds,
    missingPartIds,
    physicalComplete:
      missingOptionIds.length === 0 && missingPartIds.length === 0,
    price: {
      complete: priceComplete,
      currency,
      total,
      missingOfferLines,
      issues: mixedCurrencies ? ['mixed_currencies'] : [],
    },
  }
}

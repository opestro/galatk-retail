/** Customer-facing DZD amounts. Backend remains the source of truth. */
import { numberLocale, translate } from '@/i18n/translate'

export function formatDzd(value: string | number): string {
  const amount = typeof value === 'number' ? value : Number(value)
  const currency = translate('common.currency')
  if (!Number.isFinite(amount)) {
    return `${value} ${currency}`
  }
  return `${amount.toLocaleString(numberLocale())} ${currency}`
}

export function formatFromPrice(fromPrice: string, hasPriceRange: boolean): string {
  const formatted = formatDzd(fromPrice)
  return hasPriceRange ? translate('shop.price.from', { price: formatted }) : formatted
}

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

/**
 * POS figures: always two decimals with grouping, in the active script.
 * English → "1,250.00", Arabic → "١٬٢٥٠٫٠٠" (Arabic-Indic digits and separators).
 */
function posNumberFormat(): Intl.NumberFormat {
  const locale = numberLocale() === 'ar-DZ' ? 'ar-DZ-u-nu-arab' : 'en-US'
  return new Intl.NumberFormat(locale, { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

export function formatAmount(value: string | number | null | undefined): string {
  const amount = Number(value ?? 0)
  return Number.isFinite(amount) ? posNumberFormat().format(amount) : String(value)
}

/** "1,250.00 DZD" / "١٬٢٥٠٫٠٠ دج". */
export function formatMoney(value: string | number | null | undefined): string {
  return `${formatAmount(value)} ${translate('common.currency')}`
}

/** Plain integers (counts, stock) in the active script. */
export function formatCount(value: number): string {
  return new Intl.NumberFormat(numberLocale() === 'ar-DZ' ? 'ar-DZ-u-nu-arab' : 'en-US').format(value)
}

/** Compact table timestamp in the active script: "Oct 2, 7:01 PM" / "٢ أكتوبر، ٧:٠١ م". */
export function formatDateTime(iso: string): { date: string; time: string } {
  const locale = numberLocale() === 'ar-DZ' ? 'ar-DZ-u-nu-arab' : 'en-US'
  const value = new Date(iso)
  return {
    date: value.toLocaleDateString(locale, { day: 'numeric', month: 'short', year: 'numeric' }),
    time: value.toLocaleTimeString(locale, { hour: 'numeric', minute: '2-digit' }),
  }
}

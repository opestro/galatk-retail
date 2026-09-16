/** Customer-facing DZD amounts. Backend remains the source of truth. */
export function formatDzd(value: string | number): string {
  const amount = typeof value === 'number' ? value : Number(value)
  if (!Number.isFinite(amount)) {
    return `${value} DZD`
  }
  return `${amount.toLocaleString('en-US')} DZD`
}

export function formatFromPrice(fromPrice: string, hasPriceRange: boolean): string {
  const formatted = formatDzd(fromPrice)
  return hasPriceRange ? `From ${formatted}` : formatted
}

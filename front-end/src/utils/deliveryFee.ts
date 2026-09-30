/**
 * Looks up the courier charge for a wilaya and stop-desk vs home.
 * Missing rows fall back to the shop's legacy `deliveryFee`.
 */
import type { DeliveryService, WilayaDeliveryRate } from '@/types/api'

export function deliveryFeeForWilaya(
  rates: WilayaDeliveryRate[],
  wilaya: string,
  service: DeliveryService,
  fallbackFee = 0,
): number {
  const row = rates.find((rate) => rate.wilaya === wilaya)
  if (!row) return fallbackFee
  const raw = service === 'STOPDESK' ? row.stopdeskFee : row.homeFee
  const n = Number(raw)
  return Number.isFinite(n) ? n : fallbackFee
}

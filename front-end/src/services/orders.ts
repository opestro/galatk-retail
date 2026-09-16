import { api } from '@/services/api'
import type { OnlineOrder } from '@/types/api'

export const ORDER_STATUSES = [
  'PLACED',
  'READY_FOR_PICKUP',
  'OUT_FOR_DELIVERY',
  'COMPLETED',
  'CANCELLED',
] as const

export type OrderStatusValue = (typeof ORDER_STATUSES)[number]

/** PATCH /status targets. COMPLETED always uses the payment complete endpoint. */
export const ORDER_STATUS_TRANSITIONS: Record<string, OrderStatusValue[]> = {
  PLACED: ['READY_FOR_PICKUP', 'OUT_FOR_DELIVERY', 'CANCELLED'],
  READY_FOR_PICKUP: ['OUT_FOR_DELIVERY', 'CANCELLED'],
  OUT_FOR_DELIVERY: ['READY_FOR_PICKUP', 'CANCELLED'],
  COMPLETED: [],
  CANCELLED: [],
}

export async function listShopOrders(
  shopId: string,
  params?: { q?: string; status?: string; wilaya?: string },
) {
  const { data } = await api.get<{ data: OnlineOrder[] }>(`/shops/${shopId}/orders`, { params })
  return data.data
}

export async function getShopOrder(shopId: string, orderId: string) {
  const { data } = await api.get<{ data: OnlineOrder }>(`/shops/${shopId}/orders/${orderId}`)
  return data.data
}

export async function updateShopOrderStatus(shopId: string, orderId: string, status: string) {
  const { data } = await api.patch<{ data: OnlineOrder }>(`/shops/${shopId}/orders/${orderId}/status`, {
    status,
  })
  return data.data
}

export async function cancelShopOrder(shopId: string, orderId: string, reason?: string) {
  const { data } = await api.post<{ data: OnlineOrder }>(`/shops/${shopId}/orders/${orderId}/cancel`, {
    reason,
  })
  return data.data
}

export function orderStatusLabel(status: string): string {
  if (status === 'PLACED') return 'Pending'
  return status.replace(/_/g, ' ').toLowerCase().replace(/\b\w/g, (c) => c.toUpperCase())
}

/** Statuses staff can assign from the current one, plus Complete as a payment action. */
export function selectableOrderStatuses(status: string): OrderStatusValue[] {
  const next = ORDER_STATUS_TRANSITIONS[status] ?? []
  const canComplete = status === 'READY_FOR_PICKUP' || status === 'OUT_FOR_DELIVERY'
  return canComplete ? [...next, 'COMPLETED'] : next
}

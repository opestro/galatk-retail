import { api } from '@/services/api'
import type { OnlineOrder } from '@/types/api'

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

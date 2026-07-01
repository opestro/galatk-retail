import { api } from './api'
import type {
  Client,
  ClientLedgerEntry,
  ClientPayment,
  CreditDashboardEntry,
  CreditReminderEntry,
  FinancialSummary,
  NetworkFinancialSummary,
  ShopCharge,
} from '@/types/api'

export async function listClients(shopId: string, q?: string, activeOnly = false, withBalance = false) {
  return api.get<{ data: Client[] }>(`/shops/${shopId}/clients`, {
    params: {
      q,
      activeOnly: activeOnly || undefined,
      withBalance: withBalance || undefined,
    },
  })
}

export async function createClient(shopId: string, body: Record<string, unknown>) {
  return api.post<{ data: Client }>(`/shops/${shopId}/clients`, body)
}

export async function getClient(clientId: string) {
  return api.get<{ data: Client & { ledgerPreview?: ClientLedgerEntry[] } }>(`/clients/${clientId}`)
}

export async function updateClient(clientId: string, body: Record<string, unknown>) {
  return api.patch<{ data: Client }>(`/clients/${clientId}`, body)
}

export async function getClientLedger(clientId: string) {
  return api.get<{ data: ClientLedgerEntry[] }>(`/clients/${clientId}/ledger`)
}

export async function recordClientPayment(
  shopId: string,
  clientId: string,
  body: { amount: number; paymentMethod: string },
) {
  return api.post<{ data: ClientPayment }>(`/shops/${shopId}/clients/${clientId}/payments`, body)
}

export async function voidClientPayment(
  shopId: string,
  clientId: string,
  paymentId: string,
  reason?: string,
) {
  return api.post(`/shops/${shopId}/clients/${clientId}/payments/${paymentId}/void`, { reason })
}

export async function getCreditDashboard(shopId: string) {
  return api.get<{ data: CreditDashboardEntry[] }>(`/shops/${shopId}/credit/dashboard`)
}

export async function getCreditReminders(shopId: string) {
  return api.get<{ data: CreditReminderEntry[] }>(`/shops/${shopId}/credit/reminders`)
}

export async function logReminderContact(clientId: string, note?: string) {
  return api.post(`/clients/${clientId}/reminder-contacts`, { note })
}

export async function listCharges(shopId: string, from?: string, to?: string) {
  return api.get<{ data: ShopCharge[] }>(`/shops/${shopId}/charges`, { params: { from, to } })
}

export async function createCharge(shopId: string, body: Record<string, unknown>) {
  return api.post<{ data: ShopCharge }>(`/shops/${shopId}/charges`, body)
}

export async function voidCharge(shopId: string, chargeId: string, reason?: string) {
  return api.post(`/shops/${shopId}/charges/${chargeId}/void`, { reason })
}

export async function getFinancialSummary(shopId: string, from?: string, to?: string) {
  return api.get<{ data: FinancialSummary }>(`/shops/${shopId}/dashboard/financial-summary`, {
    params: { from, to },
  })
}

export async function getNetworkFinancialSummary(from?: string, to?: string) {
  return api.get<{ data: NetworkFinancialSummary }>(`/dashboard/network-financial-summary`, {
    params: { from, to },
  })
}

export async function createClientAdjustment(clientId: string, body: { amount: number; note?: string }) {
  return api.post(`/clients/${clientId}/adjustments`, body)
}

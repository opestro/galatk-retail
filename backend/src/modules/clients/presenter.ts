import { Client, ClientLedgerEntry, StaffUser } from '@prisma/client'
import { ClientProfileResponse, ClientResponse, LedgerEntryResponse } from './types.js'

type LedgerWithStaff = ClientLedgerEntry & {
  recordedBy: Pick<StaffUser, 'id' | 'name'>
}

export function clientPresenter(client: Client): ClientResponse {
  return {
    id: client.id,
    shopId: client.shopId,
    name: client.name,
    phone: client.phone,
    email: client.email,
    address: client.address,
    notes: client.notes,
    creditLimit: client.creditLimit?.toString() ?? null,
    balance: client.balance.toString(),
    isActive: client.isActive,
    createdAt: client.createdAt,
    updatedAt: client.updatedAt,
  }
}

export function ledgerEntryPresenter(entry: LedgerWithStaff): LedgerEntryResponse {
  return {
    id: entry.id,
    type: entry.type,
    amount: entry.amount.toString(),
    saleId: entry.saleId,
    paymentId: entry.paymentId,
    note: entry.note,
    createdAt: entry.createdAt,
    recordedBy: entry.recordedBy,
  }
}

export function clientProfilePresenter(
  client: Client,
  ledgerPreview: LedgerWithStaff[],
): ClientProfileResponse {
  return {
    ...clientPresenter(client),
    ledgerPreview: ledgerPreview.map(ledgerEntryPresenter),
  }
}

import { Client, ClientLedgerEntry, OnlineOrder, OnlineOrderLine, Product, Sale, SaleLine, StaffUser } from '@prisma/client'
import {
  ClientProfileResponse,
  ClientResponse,
  LedgerEntryResponse,
  OnlineOrderPurchaseResponse,
  PurchaseLineResponse,
  SalePurchaseResponse,
} from './types.js'

type LedgerWithStaff = ClientLedgerEntry & {
  recordedBy: Pick<StaffUser, 'id' | 'name'>
}

type SaleLineWithProduct = SaleLine & { product: Pick<Product, 'id' | 'name'> }
type SaleWithLines = Sale & {
  lines: SaleLineWithProduct[]
  cashier: Pick<StaffUser, 'id' | 'name'>
}

type OnlineOrderLineWithProduct = OnlineOrderLine & { product: Pick<Product, 'id' | 'name'> }
type OnlineOrderWithLines = OnlineOrder & { lines: OnlineOrderLineWithProduct[] }

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

function saleLinePresenter(line: SaleLineWithProduct): PurchaseLineResponse {
  return {
    productId: line.productId,
    productName: line.product.name,
    quantity: line.quantity,
    unitPrice: line.unitPrice.toString(),
    lineTotal: line.lineTotal.toString(),
  }
}

function onlineOrderLinePresenter(line: OnlineOrderLineWithProduct): PurchaseLineResponse {
  return {
    productId: line.productId,
    productName: line.product.name,
    quantity: line.quantity,
    unitPrice: line.unitPrice.toString(),
    lineTotal: line.lineTotal.toString(),
  }
}

export function salePurchasePresenter(sale: SaleWithLines): SalePurchaseResponse {
  return {
    id: sale.id,
    type: 'SALE',
    status: sale.status,
    paymentMethod: sale.paymentMethod,
    total: sale.total.toString(),
    amountPaid: sale.amountPaid.toString(),
    amountOnCredit: sale.amountOnCredit.toString(),
    createdAt: sale.createdAt,
    cashier: sale.cashier,
    lines: sale.lines.map(saleLinePresenter),
  }
}

export function onlineOrderPurchasePresenter(order: OnlineOrderWithLines): OnlineOrderPurchaseResponse {
  return {
    id: order.id,
    type: 'ONLINE_ORDER',
    orderNumber: order.orderNumber,
    status: order.status,
    fulfillmentType: order.fulfillmentType,
    total: order.total.toString(),
    createdAt: order.createdAt,
    lines: order.lines.map(onlineOrderLinePresenter),
  }
}

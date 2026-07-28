export interface CreateClientInput {
  name: string
  phone: string
  email?: string | null
  address?: string | null
  notes?: string | null
  creditLimit?: string | number | null
}

export interface UpdateClientInput {
  name?: string
  phone?: string
  email?: string | null
  address?: string | null
  notes?: string | null
  creditLimit?: string | number | null
  isActive?: boolean
}

export interface ClientResponse {
  id: string
  shopId: string
  name: string
  phone: string
  email: string | null
  address: string | null
  notes: string | null
  creditLimit: string | null
  balance: string
  isActive: boolean
  createdAt: Date
  updatedAt: Date
}

export interface ClientProfileResponse extends ClientResponse {
  ledgerPreview: LedgerEntryResponse[]
}

export interface LedgerEntryResponse {
  id: string
  type: string
  amount: string
  saleId: string | null
  paymentId: string | null
  note: string | null
  createdAt: Date
  recordedBy: { id: string; name: string }
}

export interface PurchaseLineResponse {
  productId: string
  productName: string
  quantity: number
  unitPrice: string
  lineTotal: string
}

export interface SalePurchaseResponse {
  id: string
  type: 'SALE'
  status: string
  paymentMethod: string
  total: string
  amountPaid: string
  amountOnCredit: string
  createdAt: Date
  cashier: { id: string; name: string }
  lines: PurchaseLineResponse[]
}

export interface OnlineOrderPurchaseResponse {
  id: string
  type: 'ONLINE_ORDER'
  orderNumber: string
  status: string
  fulfillmentType: string
  total: string
  createdAt: Date
  lines: PurchaseLineResponse[]
}

export interface ClientPurchasesResponse {
  sales: SalePurchaseResponse[]
  onlineOrders: OnlineOrderPurchaseResponse[]
}

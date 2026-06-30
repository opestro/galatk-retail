export type StaffRole = 'OWNER' | 'MANAGER' | 'CASHIER'

export interface StaffProfile {
  id: string
  email: string
  name: string
  role: StaffRole
  shopIds: string[]
}

export interface LoginResponse {
  token: string
  staff: StaffProfile
}

export interface Shop {
  id: string
  name: string
  slug: string
  address: string
  contactPhone: string | null
  serviceCity: string
  deliveryFee: string
  outOfStockDisplay: 'HIDE' | 'SHOW_UNAVAILABLE'
  creditReminderDays?: number
}

export interface Client {
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
  createdAt: string
  updatedAt: string
}

export interface ClientLedgerEntry {
  id: string
  type: string
  amount: string
  saleId: string | null
  paymentId: string | null
  note: string | null
  createdAt: string
  recordedBy?: { id: string; name: string }
}

export interface ClientPayment {
  id: string
  clientId: string
  shopId: string
  amount: string
  paymentMethod: string
  status: string
  createdAt: string
  recordedBy: { id: string; name: string }
}

export interface ShopCharge {
  id: string
  shopId: string
  category: string
  amount: string
  chargeDate: string
  note: string | null
  status: string
  createdAt: string
  recordedBy: { id: string; name: string }
  cancelledBy?: { id: string; name: string } | null
}

export interface CreditDashboardEntry {
  clientId: string
  name?: string
  clientName?: string
  phone: string
  balance: string
  oldestDebtAgeDays?: number
  oldestDebtDays?: number
}

export interface CreditReminderEntry extends CreditDashboardEntry {
  lastContactedAt: string | null
}

export interface FinancialSummary {
  posCollected: string
  clientPaymentsReceived: string
  totalCashIn: string
  outstandingCredit: string
  totalCharges: string
}

export interface NetworkFinancialSummary {
  shops: Array<{ shopId: string; shopName: string } & FinancialSummary>
  totals: FinancialSummary
}


export interface Product {
  id: string
  name: string
  description: string | null
  sellPrice: string
  galatkProductRef: string | null
  isActive: boolean
  availableOnline: boolean
}

export interface ShopStockItem {
  id: string
  shopId: string
  productId: string
  quantity: number
  product: { id: string; name: string; sellPrice: string }
}

export interface PosProduct {
  productId: string
  name: string
  sellPrice: string
  quantity: number
}

export interface Sale {
  id: string
  status: string
  paymentMethod: string
  total: string
  amountPaid?: string
  amountOnCredit?: string
  clientId?: string | null
  createdAt: string
  cashier: { id: string; name: string }
  lines: Array<{
    productId: string
    quantity: number
    unitPrice: string
    lineTotal: string
    product: { name: string }
  }>
}

export interface OnlineOrder {
  id: string
  orderNumber: string
  status: string
  fulfillmentType: string
  customerName: string
  customerPhone: string
  total: string
  createdAt: string
  client?: Pick<Client, 'id' | 'name' | 'phone' | 'balance' | 'creditLimit'> | null
  lines: Array<{ product: { name: string }; quantity: number }>
}

export interface DashboardSummary {
  todaySalesCount: number
  todayRevenue: string
  lowStock: Array<{ productId: string; productName: string; quantity: number }>
}

export interface StorefrontProduct {
  productId: string
  name: string
  description: string | null
  sellPrice: string
  inStock: boolean
  quantity: number
}

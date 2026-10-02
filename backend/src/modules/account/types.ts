export interface CustomerLoginInput {
  email: string
  password: string
}

export interface CustomerRegisterInput {
  name: string
  email: string
  phone: string
  password: string
}

export interface CustomerProfile {
  id: string
  name: string
  phone: string
  email: string | null
}

export interface CustomerShopBalanceResponse {
  shopId: string
  shopName: string
  shopSlug: string
  balance: string
}

export interface CustomerCreditPortionResponse {
  id: string
  shopId: string
  shopName: string
  shopSlug: string
  originalAmount: string
  remainingAmount: string
  createdAt: Date
  saleId: string | null
  saleStatus: string | null
  orderId: string | null
  orderNumber: string | null
}

export interface CustomerCreditResponse {
  totalOutstanding: string
  shops: CustomerShopBalanceResponse[]
  portions: CustomerCreditPortionResponse[]
}

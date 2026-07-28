import { api } from './api'

export interface GlobalShop {
  id: string
  name: string
  slug: string
  address: string
  serviceCity: string
  deliveryFee: string
}

export interface GlobalProductShop {
  shopId: string
  shopName: string
  shopSlug: string
  quantity: number
  inStock: boolean
}

export interface GlobalProduct {
  productId: string
  name: string
  description: string | null
  sellPrice: string
  shops: GlobalProductShop[]
}

export interface GlobalCheckoutLineInput {
  productId: string
  shopId: string
  quantity: number
}

export interface GlobalCheckoutInput {
  fulfillmentType: 'PICKUP' | 'DELIVERY'
  customerName: string
  customerPhone: string
  customerEmail?: string
  deliveryAddress?: string
  deliveryCity?: string
  lines: GlobalCheckoutLineInput[]
}

export interface GlobalCheckoutOrderResult {
  orderId: string
  shopId: string
  orderNumber: string
  total: string
  status: string
}

export interface CustomerLookupResult {
  name: string
  email: string | null
  phone: string
}

export async function listGlobalShops() {
  const res = await api.get<{ data: GlobalShop[] }>('/global-store/shops')
  return res.data.data
}

export async function listGlobalProducts() {
  const res = await api.get<{ data: GlobalProduct[] }>('/global-store/products')
  return res.data.data
}

export async function globalCheckout(input: GlobalCheckoutInput) {
  const res = await api.post<{ orders: GlobalCheckoutOrderResult[] }>('/global-store/checkout', input)
  return res.data.orders
}

export async function lookupCustomerByPhone(phone: string): Promise<CustomerLookupResult | null> {
  if (!phone?.trim()) return null

  try {
    const { data } = await api.get<{ data: CustomerLookupResult | null }>(
      `/global-store/customer-lookup?phone=${encodeURIComponent(phone.trim())}`,
    )
    return data.data
  } catch {
    return null
  }
}

export async function lookupCustomerByPhoneStorefront(
  slug: string,
  phone: string,
): Promise<CustomerLookupResult | null> {
  if (!phone?.trim()) return null

  try {
    const { data } = await api.get<{ data: CustomerLookupResult | null }>(
      `/storefront/${slug}/customer-lookup?phone=${encodeURIComponent(phone.trim())}`,
    )
    return data.data
  } catch {
    return null
  }
}

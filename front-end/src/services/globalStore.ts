import { api } from './api'

export interface GlobalShop {
  id: string
  name: string
  slug: string
  address: string
  serviceCity: string
  deliveryFee: string
}

export interface PublicCatalogShop {
  shopId: string
  shopName: string
  shopSlug: string
  quantity: number
  inStock: boolean
}

export interface PublicCatalogImage {
  id: string
  url: string
  sortOrder: number
}

export interface PublicCatalogVariant {
  id: string
  attributes: Record<string, string>
  variantLabel: string
  sellPrice: string
  shops: PublicCatalogShop[]
}

export interface PublicCatalogProductSummary {
  id: string
  slug: string
  name: string
  description: string | null
  images: PublicCatalogImage[]
  fromPrice: string
  hasPriceRange: boolean
  shops: Array<{ shopId: string; shopName: string; shopSlug: string }>
}

export interface PublicCatalogProductDetail extends PublicCatalogProductSummary {
  variants: PublicCatalogVariant[]
}

export interface GlobalCheckoutLineInput {
  productId: string
  shopId: string
  quantity: number
}

export interface GlobalCheckoutInput {
  fulfillmentType?: 'PICKUP' | 'DELIVERY'
  customerName: string
  customerPhone: string
  customerWilaya: string
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
  wilaya?: string | null
}

export async function listGlobalShops() {
  const res = await api.get<{ data: GlobalShop[] }>('/global-store/shops')
  return res.data.data
}

export async function listGlobalProducts() {
  const res = await api.get<{ data: PublicCatalogProductSummary[] }>('/global-store/products')
  return res.data.data
}

export async function getGlobalProduct(idOrSlug: string) {
  const res = await api.get<{ data: PublicCatalogProductDetail }>(
    `/global-store/products/${encodeURIComponent(idOrSlug)}`,
  )
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

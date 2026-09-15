import { FulfillmentType } from '@prisma/client'

export interface GlobalCheckoutLineInput {
  productId: string
  shopId: string
  quantity: number
}

export interface GlobalCheckoutInput {
  fulfillmentType: FulfillmentType
  customerName: string
  customerPhone: string
  customerWilaya: string
  customerEmail?: string
  deliveryAddress?: string
  deliveryCity?: string
  lines: GlobalCheckoutLineInput[]
}

/** Public shop carrying a variant — no internal stock-movement details. */
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

/**
 * Customer-facing SKU. `id` is the Product (variant) id used by cart/checkout.
 * Internal fields such as unitCost are never included.
 */
export interface PublicCatalogVariant {
  id: string
  attributes: Record<string, string>
  variantLabel: string
  sellPrice: string
  shops: PublicCatalogShop[]
}

/** Compact family card for `/store`. */
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

/** Full family payload for the product detail page. */
export interface PublicCatalogProductDetail extends PublicCatalogProductSummary {
  variants: PublicCatalogVariant[]
}

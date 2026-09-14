export interface CreateProductInput {
  name: string
  description?: string
  unitCost?: number
  sellPrice: number
  galatkProductRef?: string
  isActive?: boolean
  availableOnline?: boolean
  category?: string
  attributes?: Record<string, string>
  quantity?: number
  shopId?: string
}

export interface UpdateProductInput {
  name?: string
  description?: string
  unitCost?: number
  sellPrice?: number
  galatkProductRef?: string
  isActive?: boolean
  availableOnline?: boolean
  attributes?: Record<string, string>
}

export interface ProductResponse {
  id: string
  name: string
  description: string | null
  unitCost: string
  sellPrice: string
  galatkProductRef: string | null
  category: string
  variantLabel: string | null
  familyId: string | null
  attributes: Record<string, string>
  attributesKey: string
  isActive: boolean
  availableOnline: boolean
  shopQuantity: number | null
  /** Derived from shop stock: false when quantity is 0. */
  inStock: boolean | null
  createdAt: Date
  updatedAt: Date
}

export interface ProductImageResponse {
  id: string
  url: string
  sortOrder: number
}

export interface ProductFamilyResponse {
  id: string
  name: string
  slug: string
  description: string | null
  isActive: boolean
  availableOnline: boolean
  images: ProductImageResponse[]
  variants: ProductResponse[]
  /** False when every variant has 0 stock in the requested shop. */
  available: boolean | null
  createdAt: Date
  updatedAt: Date
}

export interface VariantInput {
  attributes?: Record<string, string>
  unitCost?: number
  sellPrice: number
  quantity?: number
  isActive?: boolean
  availableOnline?: boolean
}

export interface CreateFamilyInput {
  name: string
  description?: string
  isActive?: boolean
  availableOnline?: boolean
  variants?: VariantInput[]
  shopId?: string
}

export interface UpdateFamilyInput {
  name?: string
  description?: string
  isActive?: boolean
  availableOnline?: boolean
}

export interface UpsertVariantInput {
  attributes: Record<string, string>
  unitCost?: number
  sellPrice?: number
  quantity?: number
  isActive?: boolean
  availableOnline?: boolean
  shopId?: string
}

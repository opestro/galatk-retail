import { api } from '@/services/api'
import type { Product, ProductFamily, ProductImage } from '@/types/api'

export const DEFAULT_SIZES = ['XS', 'S', 'M', 'L', 'XL', 'XXL']
export const DEFAULT_COLORS = ['Noir', 'Blanc', 'Vert', 'Rouge', 'Bleu', 'Beige', 'Gris', 'Rose', 'Marron']

export interface VariantPayload {
  attributes: Record<string, string>
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
  variants?: VariantPayload[]
  shopId?: string
}

export interface UpdateFamilyInput {
  name?: string
  description?: string
  isActive?: boolean
  availableOnline?: boolean
}

export interface CreateProductInput {
  name: string
  unitCost?: number
  sellPrice: number
  description?: string
  availableOnline?: boolean
}

export interface UpdateProductInput {
  name?: string
  unitCost?: number
  sellPrice?: number
  description?: string
  availableOnline?: boolean
  isActive?: boolean
  attributes?: Record<string, string>
}

export function mediaUrl(path: string): string {
  if (!path) return ''
  if (path.startsWith('http://') || path.startsWith('https://')) return path
  const base = import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:8080/api/v1'
  const origin = base.replace(/\/api\/v1\/?$/, '')
  return `${origin}${path.startsWith('/') ? path : `/${path}`}`
}

export async function listProducts(query?: string): Promise<Product[]> {
  const { data } = await api.get<{ data: Product[] }>('/products', {
    params: query ? { q: query } : undefined,
  })
  return data.data
}

export async function listProductFamilies(query?: string, shopId?: string): Promise<ProductFamily[]> {
  const { data } = await api.get<{ data: ProductFamily[] }>('/products/families', {
    params: {
      ...(query ? { q: query } : {}),
      ...(shopId ? { shopId } : {}),
    },
  })
  return data.data
}

export async function getProductFamily(familyId: string, shopId?: string): Promise<ProductFamily> {
  const { data } = await api.get<{ data: ProductFamily }>(`/products/families/${familyId}`, {
    params: shopId ? { shopId } : undefined,
  })
  return data.data
}

export async function createProductFamily(input: CreateFamilyInput): Promise<ProductFamily> {
  const { data } = await api.post<{ data: ProductFamily }>('/products/families', input)
  return data.data
}

export async function updateProductFamily(
  familyId: string,
  input: UpdateFamilyInput,
  shopId?: string,
): Promise<ProductFamily> {
  const { data } = await api.patch<{ data: ProductFamily }>(`/products/families/${familyId}`, {
    ...input,
    shopId,
  })
  return data.data
}

export async function addFamilyVariant(
  familyId: string,
  input: VariantPayload & { shopId?: string },
): Promise<{ created: boolean; family: ProductFamily; product: Product }> {
  const { data } = await api.post<{
    data: { created: boolean; family: ProductFamily; product: Product }
  }>(`/products/families/${familyId}/variants`, input)
  return data.data
}

export async function uploadFamilyImage(familyId: string, file: File): Promise<ProductImage> {
  const form = new FormData()
  form.append('image', file)
  const { data } = await api.post<{ data: ProductImage }>(`/products/families/${familyId}/images`, form)
  return data.data
}

export async function deleteFamilyImage(familyId: string, imageId: string): Promise<void> {
  await api.delete(`/products/families/${familyId}/images/${imageId}`)
}

export async function createProduct(input: CreateProductInput): Promise<Product> {
  const { data } = await api.post<{ data: Product }>('/products', input)
  return data.data
}

export async function updateProduct(
  productId: string,
  input: UpdateProductInput,
): Promise<Product> {
  const { data } = await api.patch<{ data: Product }>(`/products/${productId}`, input)
  return data.data
}

export async function deleteProduct(productId: string): Promise<void> {
  await api.delete(`/products/${productId}`)
}

export async function setVariantStock(
  productId: string,
  shopId: string,
  quantity: number,
): Promise<Product> {
  const { data } = await api.patch<{ data: { product: Product } }>(`/products/${productId}/stock`, {
    shopId,
    quantity,
  })
  return data.data.product
}

export function variantInStock(product: Product): boolean {
  return (product.shopQuantity ?? 0) > 0
}

export function familyInStock(family: ProductFamily): boolean {
  if (family.available != null) return family.available
  return family.variants.some(variantInStock)
}

export function formatMarginPercent(sellPrice: string, unitCost: string): string {
  const sell = Number(sellPrice)
  const cost = Number(unitCost)
  if (!Number.isFinite(sell) || sell <= 0) return '—'
  const margin = ((sell - cost) / sell) * 100
  return `${margin.toFixed(1)}%`
}

export function apiErrorMessage(error: unknown, fallback: string): string {
  const ax = error as { response?: { data?: { message?: string; type?: string } } }
  return ax.response?.data?.message ?? fallback
}

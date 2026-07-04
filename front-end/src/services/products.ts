import { api } from '@/services/api'
import type { Product } from '@/types/api'

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
}

export async function listProducts(query?: string): Promise<Product[]> {
  const { data } = await api.get<{ data: Product[] }>('/products', {
    params: query ? { q: query } : undefined,
  })
  return data.data
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

export function formatMarginPercent(sellPrice: string, unitCost: string): string {
  const sell = Number(sellPrice)
  const cost = Number(unitCost)
  if (!Number.isFinite(sell) || sell <= 0) return '—'
  const margin = ((sell - cost) / sell) * 100
  return `${margin.toFixed(1)}%`
}

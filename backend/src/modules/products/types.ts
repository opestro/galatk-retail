export interface CreateProductInput {
  name: string
  description?: string
  unitCost?: number
  sellPrice: number
  galatkProductRef?: string
  isActive?: boolean
  availableOnline?: boolean
}

export interface UpdateProductInput {
  name?: string
  description?: string
  unitCost?: number
  sellPrice?: number
  galatkProductRef?: string
  isActive?: boolean
  availableOnline?: boolean
}

export interface ProductResponse {
  id: string
  name: string
  description: string | null
  unitCost: string
  sellPrice: string
  galatkProductRef: string | null
  isActive: boolean
  availableOnline: boolean
  createdAt: Date
  updatedAt: Date
}

import { Product } from '@prisma/client'
import { ProductResponse } from './types.js'

export function productPresenter(product: Product): ProductResponse {
  return {
    id: product.id,
    name: product.name,
    description: product.description,
    unitCost: product.unitCost.toString(),
    sellPrice: product.sellPrice.toString(),
    galatkProductRef: product.galatkProductRef,
    isActive: product.isActive,
    availableOnline: product.availableOnline,
    createdAt: product.createdAt,
    updatedAt: product.updatedAt,
  }
}

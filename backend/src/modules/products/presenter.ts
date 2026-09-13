import { Product } from '@prisma/client'
import { ProductResponse } from './types.js'
import { withFamily } from '../../shared/products/withFamily.js'

export function productPresenter(product: Product): ProductResponse {
  const family = withFamily(product)
  return {
    id: product.id,
    name: product.name,
    description: product.description,
    unitCost: product.unitCost.toString(),
    sellPrice: product.sellPrice.toString(),
    galatkProductRef: product.galatkProductRef,
    category: family.category,
    variantLabel: family.variantLabel,
    isActive: product.isActive,
    availableOnline: product.availableOnline,
    createdAt: product.createdAt,
    updatedAt: product.updatedAt,
  }
}

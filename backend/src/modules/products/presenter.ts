import { Prisma, Product, ProductFamily, ProductImage } from '@prisma/client'
import { ProductFamilyResponse, ProductImageResponse, ProductResponse } from './types.js'
import { withFamily } from '../../shared/products/withFamily.js'
import {
  attributesFromUnknown,
  displayVariantLabel,
} from '../../shared/products/variantAttributes.js'

type ProductWithOptionalFamily = Product & { family?: ProductFamily | null }

export function productPresenter(
  product: ProductWithOptionalFamily,
  shopQuantity: number | null = null,
): ProductResponse {
  const family = withFamily(product)
  const attributes = attributesFromUnknown(product.attributes)
  return {
    id: product.id,
    name: product.name,
    description: product.description,
    unitCost: product.unitCost.toString(),
    sellPrice: product.sellPrice.toString(),
    galatkProductRef: product.galatkProductRef,
    category: product.family?.name ?? family.category,
    variantLabel: displayVariantLabel(attributes, product.variantLabel ?? family.variantLabel),
    familyId: product.familyId ?? product.family?.id ?? null,
    attributes,
    attributesKey: product.attributesKey,
    isActive: product.isActive,
    availableOnline: product.availableOnline,
    shopQuantity,
    inStock: shopQuantity === null ? null : shopQuantity > 0,
    createdAt: product.createdAt,
    updatedAt: product.updatedAt,
  }
}

export function imagePresenter(image: ProductImage): ProductImageResponse {
  return {
    id: image.id,
    url: image.url,
    sortOrder: image.sortOrder,
  }
}

export function familyPresenter(
  family: ProductFamily & { images: ProductImage[]; products: Product[] },
  stockByProductId: Map<string, number> = new Map(),
  includeQuantity = false,
): ProductFamilyResponse {
  const variants = family.products.map((product) =>
    productPresenter(
      { ...product, family },
      includeQuantity ? (stockByProductId.get(product.id) ?? 0) : null,
    ),
  )
  return {
    id: family.id,
    name: family.name,
    slug: family.slug,
    description: family.description,
    isActive: family.isActive,
    availableOnline: family.availableOnline,
    images: [...family.images].sort((a, b) => a.sortOrder - b.sortOrder).map(imagePresenter),
    variants,
    available: includeQuantity ? variants.some((variant) => (variant.shopQuantity ?? 0) > 0) : null,
    createdAt: family.createdAt,
    updatedAt: family.updatedAt,
  }
}

export function isUniqueConstraint(error: unknown): boolean {
  return error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002'
}

export function isForeignKeyConstraint(error: unknown): boolean {
  return error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2003'
}

import { Product, ProductFamily, ProductImage, Shop, ShopStock } from '@prisma/client'
import {
  attributesFromUnknown,
  displayVariantLabel,
  normalizeToken,
  titleCaseWords,
} from '../../shared/products/variantAttributes.js'
import { OutOfStockDisplay } from '@prisma/client'
import {
  PublicCatalogImage,
  PublicCatalogProductDetail,
  PublicCatalogProductSummary,
  PublicCatalogShop,
  PublicCatalogVariant,
} from './types.js'

type FamilyWithCatalog = ProductFamily & {
  images: ProductImage[]
  products: Product[]
}

function moneyString(value: { toString(): string } | string | number): string {
  return typeof value === 'string' ? value : value.toString()
}

function compareMoney(a: string, b: string): number {
  return Number(a) - Number(b)
}

export function isShopStockVisible(shop: Pick<Shop, 'outOfStockDisplay'>, quantity: number): boolean {
  if (quantity > 0) return true
  return shop.outOfStockDisplay === OutOfStockDisplay.SHOW_UNAVAILABLE
}

export function publicImages(images: ProductImage[]): PublicCatalogImage[] {
  return [...images]
    .sort((a, b) => a.sortOrder - b.sortOrder)
    .map((image) => ({
      id: image.id,
      url: image.url,
      sortOrder: image.sortOrder,
    }))
}

function publicAttributeValues(attrs: Record<string, string>): Record<string, string> {
  const out: Record<string, string> = {}
  for (const [key, value] of Object.entries(attrs)) {
    const trimmed = value.trim()
    if (!trimmed) continue
    if (key === 'size') {
      out[key] = normalizeToken(trimmed) === 'unique' ? 'Unique' : trimmed.toUpperCase()
    } else {
      out[key] = titleCaseWords(trimmed)
    }
  }
  return out
}

function shopsForVariant(
  variantId: string,
  stock: ShopStock[],
  shopById: Map<string, Shop>,
): PublicCatalogShop[] {
  const shops: PublicCatalogShop[] = []
  for (const row of stock) {
    if (row.productId !== variantId) continue
    const shop = shopById.get(row.shopId)
    if (!shop || !isShopStockVisible(shop, row.quantity)) continue
    shops.push({
      shopId: shop.id,
      shopName: shop.name,
      shopSlug: shop.slug,
      quantity: row.quantity,
      inStock: row.quantity > 0,
    })
  }
  return shops.sort((a, b) => a.shopName.localeCompare(b.shopName))
}

export function publicVariant(
  product: Product,
  stock: ShopStock[],
  shopById: Map<string, Shop>,
): PublicCatalogVariant | null {
  if (!product.isActive || !product.availableOnline) {
    return null
  }
  const shops = shopsForVariant(product.id, stock, shopById)
  if (shops.length === 0) {
    return null
  }
  const attributes = publicAttributeValues(attributesFromUnknown(product.attributes))
  return {
    id: product.id,
    attributes,
    variantLabel: displayVariantLabel(attributes, product.variantLabel),
    sellPrice: moneyString(product.sellPrice),
    shops,
  }
}

function uniqueShops(variants: PublicCatalogVariant[]): PublicCatalogProductSummary['shops'] {
  const map = new Map<string, PublicCatalogProductSummary['shops'][number]>()
  for (const variant of variants) {
    for (const shop of variant.shops) {
      if (!map.has(shop.shopId)) {
        map.set(shop.shopId, {
          shopId: shop.shopId,
          shopName: shop.shopName,
          shopSlug: shop.shopSlug,
        })
      }
    }
  }
  return Array.from(map.values()).sort((a, b) => a.shopName.localeCompare(b.shopName))
}

function priceSummary(variants: PublicCatalogVariant[]): { fromPrice: string; hasPriceRange: boolean } {
  const prices = variants.map((variant) => variant.sellPrice).sort(compareMoney)
  const min = prices[0] ?? '0'
  const max = prices[prices.length - 1] ?? min
  return {
    fromPrice: min,
    hasPriceRange: prices.length > 1 && min !== max,
  }
}

/**
 * Builds a customer-safe catalog family. Returns null when the family is
 * unpublished, inactive, or has no shop-associated online variants.
 */
export function presentCatalogFamily(
  family: FamilyWithCatalog,
  stock: ShopStock[],
  shopById: Map<string, Shop>,
): PublicCatalogProductDetail | null {
  if (!family.isActive || !family.availableOnline) {
    return null
  }

  const variants = family.products
    .map((product) => publicVariant(product, stock, shopById))
    .filter((variant): variant is PublicCatalogVariant => variant !== null)
    .sort((a, b) => a.variantLabel.localeCompare(b.variantLabel))

  if (variants.length === 0) {
    return null
  }

  const { fromPrice, hasPriceRange } = priceSummary(variants)
  return {
    id: family.id,
    slug: family.slug,
    name: family.name,
    description: family.description,
    images: publicImages(family.images),
    fromPrice,
    hasPriceRange,
    shops: uniqueShops(variants),
    variants,
  }
}

export function toCatalogSummary(detail: PublicCatalogProductDetail): PublicCatalogProductSummary {
  const { variants: _variants, ...summary } = detail
  return summary
}

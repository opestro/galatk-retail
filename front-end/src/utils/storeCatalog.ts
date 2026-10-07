/**
 * Pure helpers for presenting the public catalog on the storefront
 * (ordering, categories, "new" badges, primary/secondary images).
 */
import type { PublicCatalogProductSummary } from '@/services/globalStore'
import { mediaUrl } from '@/services/products'

export type CatalogSort = 'featured' | 'new' | 'price-asc' | 'price-desc' | 'name'

export const CATALOG_SORTS: CatalogSort[] = ['featured', 'new', 'price-asc', 'price-desc', 'name']

const NEW_WINDOW_DAYS = 45
const DAY_MS = 24 * 60 * 60 * 1000

export interface CatalogCategory {
  name: string
  count: number
  image: string | null
}

export function orderedImageUrls(product: Pick<PublicCatalogProductSummary, 'images'>): string[] {
  return [...product.images]
    .sort((a, b) => a.sortOrder - b.sortOrder)
    .filter((image) => Boolean(image.url))
    .map((image) => mediaUrl(image.url))
}

export function primaryImageUrl(product: Pick<PublicCatalogProductSummary, 'images'>): string | null {
  return orderedImageUrls(product)[0] ?? null
}

function createdTime(product: PublicCatalogProductSummary): number {
  const time = product.createdAt ? Date.parse(product.createdAt) : NaN
  return Number.isFinite(time) ? time : 0
}

/**
 * Ids worth a "New" badge: created within the window and newer than the
 * catalog's oldest piece, so a catalog imported in one batch shows no badges.
 */
export function newArrivalIds(list: PublicCatalogProductSummary[], now = Date.now()): Set<string> {
  const times = list.map(createdTime).filter((time) => time > 0)
  if (times.length === 0) return new Set()
  const oldest = Math.min(...times)
  return new Set(
    list
      .filter((product) => {
        const time = createdTime(product)
        return time > oldest && now - time < NEW_WINDOW_DAYS * DAY_MS
      })
      .map((product) => product.id),
  )
}

export function sortProducts(list: PublicCatalogProductSummary[], sort: CatalogSort): PublicCatalogProductSummary[] {
  const copy = [...list]
  switch (sort) {
    case 'new':
      return copy.sort((a, b) => createdTime(b) - createdTime(a))
    case 'price-asc':
      return copy.sort((a, b) => Number(a.fromPrice) - Number(b.fromPrice))
    case 'price-desc':
      return copy.sort((a, b) => Number(b.fromPrice) - Number(a.fromPrice))
    case 'name':
      return copy.sort((a, b) => a.name.localeCompare(b.name))
    default:
      // "Featured": products with photography first, otherwise API order.
      return copy.sort((a, b) => Number(b.images.length > 0) - Number(a.images.length > 0))
  }
}

export function categoriesOf(list: PublicCatalogProductSummary[]): CatalogCategory[] {
  const map = new Map<string, CatalogCategory>()
  for (const product of list) {
    const name = product.category?.trim()
    if (!name) continue
    const entry = map.get(name)
    if (entry) {
      entry.count += 1
      entry.image ??= primaryImageUrl(product)
    } else {
      map.set(name, { name, count: 1, image: primaryImageUrl(product) })
    }
  }
  return [...map.values()].sort((a, b) => b.count - a.count || a.name.localeCompare(b.name))
}

export function matchesQuery(product: PublicCatalogProductSummary, query: string): boolean {
  const q = query.trim().toLowerCase()
  if (!q) return true
  return (
    product.name.toLowerCase().includes(q) ||
    product.slug.toLowerCase().includes(q) ||
    (product.category?.toLowerCase().includes(q) ?? false) ||
    (product.description?.toLowerCase().includes(q) ?? false)
  )
}

/** Short secondary line under a product name: category, else the only shop. */
export function productMeta(product: PublicCatalogProductSummary): string {
  const sameAsName = (value: string) => value.trim().toLowerCase() === product.name.trim().toLowerCase()
  if (product.category && !sameAsName(product.category)) return product.category
  if (product.shops.length === 1) return product.shops[0]!.shopName
  return ''
}

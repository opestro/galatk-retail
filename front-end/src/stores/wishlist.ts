import { defineStore } from 'pinia'
import { computed, ref, watch } from 'vue'
import type { PublicCatalogProductSummary } from '@/services/globalStore'
import { primaryImageUrl } from '@/utils/storeCatalog'

const STORAGE_KEY = 'galatk_store_wishlist_v1'

/** Snapshot kept on this device so the wishlist renders before the catalog loads. */
export interface WishlistItem {
  id: string
  slug: string
  name: string
  image: string | null
  fromPrice: string
  hasPriceRange: boolean
  category: string | null
  addedAt: string
}

function isWishlistItem(value: unknown): value is WishlistItem {
  const item = value as WishlistItem
  return Boolean(item) && typeof item.id === 'string' && typeof item.name === 'string' && typeof item.fromPrice === 'string'
}

function readStorage(): WishlistItem[] {
  try {
    const parsed: unknown = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? '[]')
    return Array.isArray(parsed) ? parsed.filter(isWishlistItem) : []
  } catch {
    return []
  }
}

/** Device-local wishlist (no account sync yet). */
export const useWishlistStore = defineStore('wishlist', () => {
  const items = ref<WishlistItem[]>(readStorage())

  const count = computed(() => items.value.length)
  const ids = computed(() => new Set(items.value.map((item) => item.id)))

  watch(
    items,
    (value) => {
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(value))
      } catch {
        // Storage full or blocked: the wishlist still works for this session.
      }
    },
    { deep: true },
  )

  function has(id: string) {
    return ids.value.has(id)
  }

  function toggle(product: PublicCatalogProductSummary) {
    if (has(product.id)) {
      remove(product.id)
      return false
    }
    items.value.unshift({
      id: product.id,
      slug: product.slug,
      name: product.name,
      image: primaryImageUrl(product),
      fromPrice: product.fromPrice,
      hasPriceRange: product.hasPriceRange,
      category: product.category ?? null,
      addedAt: new Date().toISOString(),
    })
    return true
  }

  function remove(id: string) {
    items.value = items.value.filter((item) => item.id !== id)
  }

  return { items, count, has, toggle, remove }
})

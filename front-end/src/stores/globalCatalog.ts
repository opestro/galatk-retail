import { defineStore } from 'pinia'
import { computed, ref } from 'vue'
import { listGlobalProducts, type PublicCatalogProductSummary } from '@/services/globalStore'
import { categoriesOf, newArrivalIds, sortProducts } from '@/utils/storeCatalog'

/**
 * Session cache of the public catalog listing. The header (categories,
 * search), home page, listing and "you might also like" rails all read from
 * one request instead of refetching per view.
 */
export const useGlobalCatalogStore = defineStore('globalCatalog', () => {
  const products = ref<PublicCatalogProductSummary[]>([])
  const status = ref<'idle' | 'loading' | 'ready' | 'error'>('idle')
  let pending: Promise<void> | null = null

  const categories = computed(() => categoriesOf(products.value))
  const newest = computed(() => sortProducts(products.value, 'new'))
  const newIds = computed(() => newArrivalIds(products.value))

  function load(force = false): Promise<void> {
    if (!force && status.value === 'ready') return Promise.resolve()
    if (pending) return pending
    status.value = 'loading'
    pending = listGlobalProducts()
      .then((rows) => {
        products.value = rows
        status.value = 'ready'
      })
      .catch(() => {
        status.value = 'error'
      })
      .finally(() => {
        pending = null
      })
    return pending
  }

  function findById(id: string) {
    return products.value.find((product) => product.id === id || product.slug === id)
  }

  /** Same-category products first, then the rest, excluding `productId`. */
  function related(productId: string, category: string | null | undefined, limit = 4) {
    const others = products.value.filter((product) => product.id !== productId)
    const same = category ? others.filter((product) => product.category === category) : []
    const rest = others.filter((product) => !same.includes(product))
    return [...same, ...sortProducts(rest, 'featured')].slice(0, limit)
  }

  return { products, status, categories, newest, newIds, load, findById, related }
})

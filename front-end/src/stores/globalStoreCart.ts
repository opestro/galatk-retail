import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import type { GlobalProduct } from '@/services/globalStore'

export interface GlobalCartLine {
  productId: string
  shopId: string
  shopName: string
  name: string
  sellPrice: string
  quantity: number
  maxQuantity: number
}

export const useGlobalStoreCartStore = defineStore('globalStoreCart', () => {
  const lines = ref<GlobalCartLine[]>([])

  const total = computed(() =>
    lines.value.reduce((sum, l) => sum + Number(l.sellPrice) * l.quantity, 0),
  )

  const shopCount = computed(() => new Set(lines.value.map((l) => l.shopId)).size)

  /**
   * Adds a product to the cart from a specific shop. A product can appear in
   * multiple shops, so the cart line is keyed by (productId, shopId) — the
   * same product bought from two different shops results in two lines.
   */
  function addProduct(product: GlobalProduct, shopId: string) {
    const shop = product.shops.find((s) => s.shopId === shopId)
    if (!shop || !shop.inStock) return

    const existing = lines.value.find((l) => l.productId === product.productId && l.shopId === shopId)
    if (existing) {
      if (existing.quantity < shop.quantity) {
        existing.quantity += 1
      }
    } else {
      lines.value.push({
        productId: product.productId,
        shopId: shop.shopId,
        shopName: shop.shopName,
        name: product.name,
        sellPrice: product.sellPrice,
        quantity: 1,
        maxQuantity: shop.quantity,
      })
    }
  }

  function updateQuantity(productId: string, shopId: string, quantity: number) {
    const line = lines.value.find((l) => l.productId === productId && l.shopId === shopId)
    if (line) {
      line.quantity = Math.min(Math.max(1, quantity), line.maxQuantity)
    }
  }

  function removeLine(productId: string, shopId: string) {
    lines.value = lines.value.filter((l) => !(l.productId === productId && l.shopId === shopId))
  }

  function clear() {
    lines.value = []
  }

  return { lines, total, shopCount, addProduct, updateQuantity, removeLine, clear }
})

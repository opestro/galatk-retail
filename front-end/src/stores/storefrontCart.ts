import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import type { StorefrontProduct } from '@/types/api'

export interface StorefrontCartLine {
  productId: string
  name: string
  sellPrice: string
  quantity: number
  maxQuantity: number
}

export const useStorefrontCartStore = defineStore('storefrontCart', () => {
  const lines = ref<StorefrontCartLine[]>([])

  const total = computed(() =>
    lines.value.reduce((sum, l) => sum + Number(l.sellPrice) * l.quantity, 0),
  )

  function addProduct(product: StorefrontProduct) {
    if (!product.inStock) return
    const existing = lines.value.find((l) => l.productId === product.productId)
    if (existing) {
      if (existing.quantity < product.quantity) {
        existing.quantity += 1
      }
    } else {
      lines.value.push({
        productId: product.productId,
        name: product.name,
        sellPrice: product.sellPrice,
        quantity: 1,
        maxQuantity: product.quantity,
      })
    }
  }

  function updateQuantity(productId: string, quantity: number) {
    const line = lines.value.find((l) => l.productId === productId)
    if (line) {
      line.quantity = Math.min(Math.max(1, quantity), line.maxQuantity)
    }
  }

  function removeLine(productId: string) {
    lines.value = lines.value.filter((l) => l.productId !== productId)
  }

  function clear() {
    lines.value = []
  }

  return { lines, total, addProduct, updateQuantity, removeLine, clear }
})

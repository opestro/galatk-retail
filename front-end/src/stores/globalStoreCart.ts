import { defineStore } from 'pinia'
import { ref, computed } from 'vue'

export interface GlobalCartLine {
  productId: string
  shopId: string
  shopName: string
  name: string
  variantLabel: string | null
  sellPrice: string
  quantity: number
  maxQuantity: number
}

export interface AddCartItemInput {
  productId: string
  shopId: string
  shopName: string
  name: string
  variantLabel?: string | null
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

  const itemCount = computed(() => lines.value.reduce((sum, line) => sum + line.quantity, 0))

  /**
   * Cart lines are keyed by (variant productId, shopId). Identical variants
   * from the same shop merge quantities; different variants stay separate.
   * Display price is copied for the UI; checkout ignores it and uses the API.
   */
  function addItem(input: AddCartItemInput) {
    if (!input.shopId || input.maxQuantity < 1 || input.quantity < 1) return

    const existing = lines.value.find((l) => l.productId === input.productId && l.shopId === input.shopId)
    if (existing) {
      existing.quantity = Math.min(existing.quantity + input.quantity, input.maxQuantity)
      existing.maxQuantity = input.maxQuantity
      existing.sellPrice = input.sellPrice
      existing.name = input.name
      existing.variantLabel = input.variantLabel ?? existing.variantLabel
      existing.shopName = input.shopName
      return
    }

    lines.value.push({
      productId: input.productId,
      shopId: input.shopId,
      shopName: input.shopName,
      name: input.name,
      variantLabel: input.variantLabel ?? null,
      sellPrice: input.sellPrice,
      quantity: Math.min(input.quantity, input.maxQuantity),
      maxQuantity: input.maxQuantity,
    })
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

  return { lines, total, shopCount, itemCount, addItem, updateQuantity, removeLine, clear }
})

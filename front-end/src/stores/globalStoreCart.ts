import { defineStore } from 'pinia'
import { ref, computed, watch } from 'vue'

const STORAGE_KEY = 'galatk_store_cart_v1'

export interface GlobalCartLine {
  productId: string
  shopId: string
  shopName: string
  name: string
  variantLabel: string | null
  sellPrice: string
  quantity: number
  maxQuantity: number
  /** Display-only extras; absent on lines saved before they existed. */
  image?: string | null
  slug?: string | null
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
  image?: string | null
  slug?: string | null
}

function isCartLine(value: unknown): value is GlobalCartLine {
  const line = value as GlobalCartLine
  return (
    Boolean(line) &&
    typeof line.productId === 'string' &&
    typeof line.shopId === 'string' &&
    typeof line.name === 'string' &&
    typeof line.sellPrice === 'string' &&
    Number.isInteger(line.quantity) &&
    line.quantity > 0
  )
}

function readStorage(): GlobalCartLine[] {
  try {
    const parsed: unknown = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? '[]')
    return Array.isArray(parsed) ? parsed.filter(isCartLine) : []
  } catch {
    return []
  }
}

export const useGlobalStoreCartStore = defineStore('globalStoreCart', () => {
  const lines = ref<GlobalCartLine[]>(readStorage())
  /** Last line added, for the "added to bag" confirmation. */
  const lastAdded = ref<{ line: GlobalCartLine; quantity: number; at: number } | null>(null)

  watch(
    lines,
    (value) => {
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(value))
      } catch {
        // Storage blocked: cart still works for this session.
      }
    },
    { deep: true },
  )

  const total = computed(() =>
    lines.value.reduce((sum, l) => sum + Number(l.sellPrice) * l.quantity, 0),
  )

  const shopCount = computed(() => new Set(lines.value.map((l) => l.shopId)).size)

  const itemCount = computed(() => lines.value.reduce((sum, line) => sum + line.quantity, 0))

  /**
   * Cart lines are keyed by (variant productId, shopId). Identical variants
   * from the same shop merge quantities; different variants stay separate.
   * Display price is copied for the UI; checkout ignores it and uses the API.
   * Quantity is not capped by shop stock — storefront orders may oversell.
   */
  function addItem(input: AddCartItemInput) {
    if (!input.shopId || input.quantity < 1) return

    const maxQuantity = Math.max(input.maxQuantity, 99)

    const existing = lines.value.find((l) => l.productId === input.productId && l.shopId === input.shopId)
    if (existing) {
      existing.quantity = Math.min(existing.quantity + input.quantity, maxQuantity)
      existing.maxQuantity = maxQuantity
      existing.sellPrice = input.sellPrice
      existing.name = input.name
      existing.variantLabel = input.variantLabel ?? existing.variantLabel
      existing.shopName = input.shopName
      existing.image = input.image ?? existing.image ?? null
      existing.slug = input.slug ?? existing.slug ?? null
      lastAdded.value = { line: { ...existing }, quantity: input.quantity, at: Date.now() }
      return
    }

    const line: GlobalCartLine = {
      productId: input.productId,
      shopId: input.shopId,
      shopName: input.shopName,
      name: input.name,
      variantLabel: input.variantLabel ?? null,
      sellPrice: input.sellPrice,
      quantity: Math.min(input.quantity, maxQuantity),
      maxQuantity,
      image: input.image ?? null,
      slug: input.slug ?? null,
    }
    lines.value.push(line)
    lastAdded.value = { line: { ...line }, quantity: line.quantity, at: Date.now() }
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

  function dismissLastAdded() {
    lastAdded.value = null
  }

  return {
    lines,
    lastAdded,
    total,
    shopCount,
    itemCount,
    addItem,
    updateQuantity,
    removeLine,
    clear,
    dismissLastAdded,
  }
})

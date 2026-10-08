import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import type { Client, PosProduct } from '@/types/api'

export interface CartLine {
  productId: string
  name: string
  sellPrice: string
  quantity: number
  /** Display-only details captured when the line is added. */
  variantLabel?: string | null
  imageUrl?: string | null
  /** Units on hand when added; caps the stepper. */
  stock?: number
}

export type CheckoutMode = 'full' | 'partial' | 'payLater'

export const usePosCartStore = defineStore('posCart', () => {
  const lines = ref<CartLine[]>([])
  const selectedClient = ref<Client | null>(null)
  const amountPaid = ref(0)
  const checkoutMode = ref<CheckoutMode>('full')

  const total = computed(() =>
    lines.value.reduce((sum, l) => sum + Number(l.sellPrice) * l.quantity, 0),
  )

  const itemCount = computed(() => lines.value.reduce((sum, l) => sum + l.quantity, 0))

  const amountOnCredit = computed(() => {
    if (!selectedClient.value) return 0
    if (checkoutMode.value === 'payLater') return total.value
    return Math.max(0, total.value - amountPaid.value)
  })

  const projectedBalance = computed(() => {
    if (!selectedClient.value) return 0
    return Number(selectedClient.value.balance) + amountOnCredit.value
  })

  const creditLimitExceeded = computed(() => {
    if (!selectedClient.value?.creditLimit) return false
    return projectedBalance.value > Number(selectedClient.value.creditLimit)
  })

  function addProductQty(product: PosProduct, qty = 1) {
    const existing = lines.value.find((l) => l.productId === product.productId)
    if (existing) {
      const remaining = product.quantity - existing.quantity
      if (remaining > 0) existing.quantity += Math.min(qty, remaining)
    } else {
      lines.value.push({
        productId: product.productId,
        name: product.name,
        sellPrice: product.sellPrice,
        quantity: Math.min(qty, product.quantity),
        variantLabel: product.variantLabel ?? null,
        imageUrl: product.imageUrl ?? null,
        stock: product.quantity,
      })
    }
  }

  function addProduct(product: PosProduct) {
    addProductQty(product, 1)
  }

  function updateQuantity(productId: string, quantity: number) {
    const line = lines.value.find((l) => l.productId === productId)
    if (line) {
      line.quantity = Math.min(line.stock ?? Infinity, Math.max(1, quantity))
    }
  }

  function quantityOf(productId: string): number {
    return lines.value.find((l) => l.productId === productId)?.quantity ?? 0
  }

  function removeLine(productId: string) {
    lines.value = lines.value.filter((l) => l.productId !== productId)
  }

  function selectClient(client: Client | null) {
    selectedClient.value = client
    if (!client) {
      checkoutMode.value = 'full'
      amountPaid.value = 0
    } else {
      syncAmountPaid()
    }
  }

  function setCheckoutMode(mode: CheckoutMode) {
    checkoutMode.value = mode
    syncAmountPaid()
  }

  function syncAmountPaid() {
    if (!selectedClient.value) {
      amountPaid.value = total.value
      return
    }
    if (checkoutMode.value === 'full') {
      amountPaid.value = total.value
    } else if (checkoutMode.value === 'payLater') {
      amountPaid.value = 0
    }
  }

  function clear() {
    lines.value = []
    selectedClient.value = null
    amountPaid.value = 0
    checkoutMode.value = 'full'
  }

  return {
    lines,
    selectedClient,
    amountPaid,
    checkoutMode,
    total,
    itemCount,
    amountOnCredit,
    projectedBalance,
    creditLimitExceeded,
    addProduct,
    addProductQty,
    updateQuantity,
    quantityOf,
    removeLine,
    selectClient,
    setCheckoutMode,
    syncAmountPaid,
    clear,
  }
})

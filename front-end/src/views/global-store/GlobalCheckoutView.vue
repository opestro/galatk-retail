<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import { useRouter, RouterLink } from 'vue-router'
import { globalCheckout, lookupCustomerByPhone } from '@/services/globalStore'
import { useGlobalStoreCartStore } from '@/stores/globalStoreCart'
import { Check, Loader2, Minus, Plus, ShoppingBag, Store, Trash2, Truck } from 'lucide-vue-next'

const router = useRouter()
const cart = useGlobalStoreCartStore()

const form = ref({
  fulfillmentType: 'PICKUP' as 'PICKUP' | 'DELIVERY',
  customerName: '',
  customerPhone: '',
  customerEmail: '',
  deliveryAddress: '',
  deliveryCity: '',
})
const error = ref('')
const submitting = ref(false)
const lookupStatus = ref<'idle' | 'loading' | 'found' | 'not-found'>('idle')

let debounceTimer: ReturnType<typeof setTimeout> | null = null

watch(
  () => form.value.customerPhone,
  async (phone) => {
    if (debounceTimer) clearTimeout(debounceTimer)
    
    if (!phone?.trim() || phone.trim().length < 6) {
      lookupStatus.value = 'idle'
      return
    }

    lookupStatus.value = 'loading'
    debounceTimer = setTimeout(async () => {
      const result = await lookupCustomerByPhone(phone)
      if (result) {
        form.value.customerName = result.name
        form.value.customerEmail = result.email ?? ''
        lookupStatus.value = 'found'
        setTimeout(() => {
          if (lookupStatus.value === 'found') lookupStatus.value = 'idle'
        }, 2000)
      } else {
        lookupStatus.value = 'not-found'
        setTimeout(() => {
          if (lookupStatus.value === 'not-found') lookupStatus.value = 'idle'
        }, 2000)
      }
    }, 500)
  },
)

// Group cart lines by shop for display purposes (one order per shop group)
const linesByShop = computed(() => {
  const groups = new Map<string, { shopName: string; lines: typeof cart.lines }>()
  for (const line of cart.lines) {
    const group = groups.get(line.shopId)
    if (group) {
      group.lines.push(line)
    } else {
      groups.set(line.shopId, { shopName: line.shopName, lines: [line] })
    }
  }
  return groups
})

async function submit() {
  error.value = ''
  submitting.value = true
  try {
    const orders = await globalCheckout({
      ...form.value,
      lines: cart.lines.map((l) => ({ productId: l.productId, shopId: l.shopId, quantity: l.quantity })),
    })
    cart.clear()
    const orderNumbers = orders.map((o) => o.orderNumber).join(',')
    await router.push(`/store/confirmation?orders=${encodeURIComponent(orderNumbers)}`)
  } catch {
    error.value = 'Checkout failed — check stock and delivery city for each shop'
  } finally {
    submitting.value = false
  }
}
</script>

<template>
  <div class="flex flex-col gap-6">
    <h1 class="text-2xl font-semibold text-gray-900">Checkout</h1>

    <div v-if="cart.lines.length === 0" class="flex flex-col items-center gap-3 rounded-xl border border-gray-200 bg-white py-16 text-center">
      <ShoppingBag class="h-10 w-10 text-gray-300" />
      <p class="text-gray-500">Your cart is empty.</p>
      <RouterLink to="/store" class="btn-primary mt-2">Browse products</RouterLink>
    </div>

    <div v-else class="grid gap-6 lg:grid-cols-3">
      <!-- Order summary -->
      <div class="order-2 flex flex-col gap-4 lg:order-1 lg:col-span-2">
        <div v-if="linesByShop.size > 1" class="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
          Your cart has items from {{ linesByShop.size }} different shops. This will be placed as
          {{ linesByShop.size }} separate orders, one per shop.
        </div>

        <div v-for="[shopId, group] in linesByShop" :key="shopId" class="overflow-hidden rounded-xl border border-gray-200 bg-white">
          <div class="flex items-center gap-2 border-b border-gray-200 bg-gray-50 px-4 py-3">
            <Store class="h-4 w-4 text-gray-500" />
            <p class="text-sm font-medium text-gray-900">{{ group.shopName }}</p>
          </div>
          <ul class="divide-y divide-gray-100">
            <li
              v-for="line in group.lines"
              :key="`${line.productId}-${line.shopId}`"
              class="flex flex-wrap items-center gap-3 px-4 py-3 sm:flex-nowrap sm:gap-4"
            >
              <div class="min-w-0 flex-1 basis-full sm:basis-auto">
                <p class="truncate text-sm font-medium text-gray-900">{{ line.name }}</p>
                <p class="text-xs text-gray-500">{{ line.sellPrice }} DZD each</p>
              </div>

              <div class="flex items-center gap-1 rounded-md border border-gray-200">
                <button
                  type="button"
                  class="flex h-10 w-10 items-center justify-center text-gray-500 hover:text-gray-900"
                  @click="cart.updateQuantity(line.productId, line.shopId, line.quantity - 1)"
                >
                  <Minus class="h-3.5 w-3.5" />
                </button>
                <span class="w-6 text-center text-sm">{{ line.quantity }}</span>
                <button
                  type="button"
                  class="flex h-10 w-10 items-center justify-center text-gray-500 hover:text-gray-900"
                  :disabled="line.quantity >= line.maxQuantity"
                  @click="cart.updateQuantity(line.productId, line.shopId, line.quantity + 1)"
                >
                  <Plus class="h-3.5 w-3.5" />
                </button>
              </div>

              <p class="w-20 shrink-0 text-right text-sm font-medium text-gray-900">
                {{ (Number(line.sellPrice) * line.quantity).toFixed(2) }} DZD
              </p>

              <button
                type="button"
                class="flex h-10 w-10 shrink-0 items-center justify-center text-gray-400 hover:text-red-600"
                @click="cart.removeLine(line.productId, line.shopId)"
              >
                <Trash2 class="h-4 w-4" />
              </button>
            </li>
          </ul>
        </div>
      </div>

      <!-- Customer / fulfillment form -->
      <form class="order-1 flex flex-col gap-4 rounded-xl border border-gray-200 bg-white p-5 lg:order-2 lg:sticky lg:top-24 lg:h-fit" @submit.prevent="submit">
        <h2 class="text-sm font-semibold text-gray-900">Order details</h2>

        <div class="grid grid-cols-2 gap-2">
          <label
            class="flex min-h-11 cursor-pointer items-center justify-center gap-2 rounded-md border px-3 py-2.5 text-sm"
            :class="form.fulfillmentType === 'PICKUP' ? 'border-gray-900 bg-gray-900 text-white' : 'border-gray-300 text-gray-700'"
          >
            <input v-model="form.fulfillmentType" type="radio" value="PICKUP" class="hidden" />
            <ShoppingBag class="h-4 w-4" />
            Pickup
          </label>
          <label
            class="flex min-h-11 cursor-pointer items-center justify-center gap-2 rounded-md border px-3 py-2.5 text-sm"
            :class="form.fulfillmentType === 'DELIVERY' ? 'border-gray-900 bg-gray-900 text-white' : 'border-gray-300 text-gray-700'"
          >
            <input v-model="form.fulfillmentType" type="radio" value="DELIVERY" class="hidden" />
            <Truck class="h-4 w-4" />
            Delivery
          </label>
        </div>

        <div class="relative">
          <input v-model="form.customerPhone" placeholder="Phone" required class="input" />
          <Loader2
            v-if="lookupStatus === 'loading'"
            class="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 animate-spin text-gray-400"
          />
          <Check
            v-else-if="lookupStatus === 'found'"
            class="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-green-600"
          />
        </div>
        <p v-if="lookupStatus === 'found'" class="-mt-2 text-xs text-green-600">
          Welcome back! Name and email auto-filled.
        </p>
        <input v-model="form.customerName" placeholder="Your name" required class="input" />
        <input v-model="form.customerEmail" type="email" placeholder="Email (optional)" class="input" />

        <template v-if="form.fulfillmentType === 'DELIVERY'">
          <input v-model="form.deliveryAddress" placeholder="Delivery address" required class="input" />
          <input v-model="form.deliveryCity" placeholder="Delivery city" required class="input" />
        </template>

        <div class="flex items-center justify-between border-t border-gray-100 pt-4 text-base font-semibold text-gray-900">
          <span>Total</span>
          <span>{{ cart.total.toFixed(2) }} DZD</span>
        </div>

        <p v-if="error" class="text-sm text-red-600">{{ error }}</p>

        <button type="submit" class="btn-primary w-full" :disabled="submitting">
          {{ submitting ? 'Placing order…' : 'Place order' }}
        </button>
      </form>
    </div>
  </div>
</template>

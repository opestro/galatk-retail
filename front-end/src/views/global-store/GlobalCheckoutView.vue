<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import { useRouter, RouterLink } from 'vue-router'
import axios from 'axios'
import { globalCheckout, lookupCustomerByPhone } from '@/services/globalStore'
import { useGlobalStoreCartStore } from '@/stores/globalStoreCart'
import { ALGERIA_WILAYAS, isValidWilaya } from '@/data/algeriaWilayas'
import { normalizeAlgerianPhone, validateCustomerName } from '@/utils/algerianPhone'
import { formatDzd } from '@/utils/formatMoney'
import { Check, Loader2, Minus, Plus, ShoppingBag, Store, Trash2 } from 'lucide-vue-next'

const router = useRouter()
const cart = useGlobalStoreCartStore()

const form = ref({
  customerName: '',
  customerPhone: '',
  customerWilaya: '',
})
const fieldErrors = ref({ name: '', phone: '', wilaya: '' })
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
        if (result.wilaya) form.value.customerWilaya = result.wilaya
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

function validateForm(): boolean {
  fieldErrors.value = { name: '', phone: '', wilaya: '' }
  if (!validateCustomerName(form.value.customerName)) {
    fieldErrors.value.name = 'Please enter your full name.'
  }
  if (!normalizeAlgerianPhone(form.value.customerPhone)) {
    fieldErrors.value.phone = 'Please enter a valid Algerian phone number (05, 06, or 07).'
  }
  if (!isValidWilaya(form.value.customerWilaya)) {
    fieldErrors.value.wilaya = 'Please select a wilaya.'
  }
  return !fieldErrors.value.name && !fieldErrors.value.phone && !fieldErrors.value.wilaya
}

async function submit() {
  error.value = ''
  if (!validateForm()) return
  submitting.value = true
  try {
    const orders = await globalCheckout({
      fulfillmentType: 'PICKUP',
      customerName: form.value.customerName.trim(),
      customerPhone: normalizeAlgerianPhone(form.value.customerPhone) ?? form.value.customerPhone,
      customerWilaya: form.value.customerWilaya,
      lines: cart.lines.map((l) => ({ productId: l.productId, shopId: l.shopId, quantity: l.quantity })),
    })
    const total = orders.reduce((sum, order) => sum + Number(order.total), 0)
    cart.clear()
    await router.push({
      path: '/store/confirmation',
      query: {
        orders: orders.map((o) => o.orderNumber).join(','),
        total: String(total),
        phone: normalizeAlgerianPhone(form.value.customerPhone) ?? form.value.customerPhone,
        wilaya: form.value.customerWilaya,
        name: form.value.customerName.trim(),
      },
    })
  } catch (err) {
    if (axios.isAxiosError(err)) {
      const type = err.response?.data?.type as string | undefined
      const message = err.response?.data?.message as string | undefined
      if (type === 'INSUFFICIENT_STOCK') {
        error.value = 'Not enough stock for one of the items. Please update your cart.'
      } else {
        error.value = message || 'Could not place the order. Please try again.'
      }
    } else {
      error.value = 'Could not place the order. Please try again.'
    }
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
      <div class="order-2 flex flex-col gap-4 lg:order-1 lg:col-span-2">
        <div v-if="linesByShop.size > 1" class="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
          Your cart has items from {{ linesByShop.size }} different shops. This will be placed as
          {{ linesByShop.size }} separate orders, one per shop.
        </div>

        <section class="overflow-hidden rounded-xl border border-gray-200 bg-white">
          <h2 class="border-b border-gray-200 bg-gray-50 px-4 py-3 text-sm font-semibold text-gray-900">
            Order summary
          </h2>
          <div v-for="[shopId, group] in linesByShop" :key="shopId">
            <div class="flex items-center gap-2 border-b border-gray-100 px-4 py-2">
              <Store class="h-4 w-4 text-gray-500" />
              <p class="text-xs font-medium text-gray-600">{{ group.shopName }}</p>
            </div>
            <ul class="divide-y divide-gray-100">
              <li
                v-for="line in group.lines"
                :key="`${line.productId}-${line.shopId}`"
                class="flex flex-wrap items-center gap-3 px-4 py-3 sm:flex-nowrap sm:gap-4"
              >
                <div class="min-w-0 flex-1 basis-full sm:basis-auto">
                  <p class="truncate text-sm font-medium text-gray-900">{{ line.name }}</p>
                  <p v-if="line.variantLabel" class="text-xs text-gray-500">{{ line.variantLabel }}</p>
                  <p class="text-xs text-gray-500">{{ formatDzd(line.sellPrice) }} each</p>
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

                <p class="w-24 shrink-0 text-right text-sm font-medium text-gray-900">
                  {{ formatDzd(Number(line.sellPrice) * line.quantity) }}
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
        </section>
      </div>

      <form
        class="order-1 flex flex-col gap-4 rounded-xl border border-gray-200 bg-white p-5 lg:order-2 lg:sticky lg:top-24 lg:h-fit"
        @submit.prevent="submit"
      >
        <h2 class="text-sm font-semibold text-gray-900">Customer information</h2>

        <label class="flex flex-col gap-1.5">
          <span class="text-sm text-gray-700">Full name</span>
          <input v-model="form.customerName" type="text" autocomplete="name" class="input" />
          <p v-if="fieldErrors.name" class="text-xs text-red-600">{{ fieldErrors.name }}</p>
        </label>

        <label class="flex flex-col gap-1.5">
          <span class="text-sm text-gray-700">Phone number</span>
          <div class="relative">
            <input v-model="form.customerPhone" type="tel" inputmode="tel" autocomplete="tel" placeholder="05XXXXXXXX" class="input" />
            <Loader2
              v-if="lookupStatus === 'loading'"
              class="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 animate-spin text-gray-400"
            />
            <Check
              v-else-if="lookupStatus === 'found'"
              class="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-green-600"
            />
          </div>
          <p v-if="lookupStatus === 'found'" class="text-xs text-green-600">Welcome back — details filled in.</p>
          <p v-if="fieldErrors.phone" class="text-xs text-red-600">{{ fieldErrors.phone }}</p>
        </label>

        <label class="flex flex-col gap-1.5">
          <span class="text-sm text-gray-700">Wilaya</span>
          <select v-model="form.customerWilaya" class="input">
            <option value="">Select wilaya</option>
            <option v-for="wilaya in ALGERIA_WILAYAS" :key="wilaya" :value="wilaya">{{ wilaya }}</option>
          </select>
          <p v-if="fieldErrors.wilaya" class="text-xs text-red-600">{{ fieldErrors.wilaya }}</p>
        </label>

        <div class="flex items-center justify-between border-t border-gray-100 pt-4 text-base font-semibold text-gray-900">
          <span>Total</span>
          <span>{{ formatDzd(cart.total) }}</span>
        </div>

        <p v-if="error" class="text-sm text-red-600">{{ error }}</p>

        <button type="submit" class="btn-primary w-full" :disabled="submitting">
          {{ submitting ? 'Confirming…' : 'Confirm Order' }}
        </button>
      </form>
    </div>
  </div>
</template>

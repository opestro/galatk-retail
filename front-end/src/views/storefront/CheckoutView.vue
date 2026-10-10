<script setup lang="ts">
import { ref, onMounted, watch, computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { useRoute, useRouter } from 'vue-router'
import { api } from '@/services/api'
import { useStorefrontCartStore } from '@/stores/storefrontCart'
import { useCustomerAuthStore } from '@/stores/customerAuth'
import { lookupCustomerByPhoneStorefront } from '@/services/globalStore'
import { ALGERIA_WILAYAS } from '@/data/algeriaWilayas'
import DeliveryMethodPicker, { type DeliveryMethodOption } from '@/components/storefront/DeliveryMethodPicker.vue'
import { Check, Loader2 } from 'lucide-vue-next'
import type { CustomerLoginResponse, DeliveryService, WilayaDeliveryRate } from '@/types/api'
import { deliveryFeeForWilaya } from '@/utils/deliveryFee'
import { formatDzd } from '@/utils/formatMoney'

const { t } = useI18n()
const route = useRoute()
const router = useRouter()
const cart = useStorefrontCartStore()
const customerAuth = useCustomerAuthStore()

const shop = ref<{ serviceCity: string; deliveryFee: string; deliveryRates?: WilayaDeliveryRate[] } | null>(
  null,
)
const loading = ref(true)
const form = ref({
  method: 'PICKUP' as 'PICKUP' | DeliveryService,
  customerName: customerAuth.customer?.name ?? '',
  customerPhone: customerAuth.customer?.phone ?? '',
  customerEmail: customerAuth.customer?.email ?? '',
  customerWilaya: '',
  deliveryAddress: '',
  deliveryCity: '',
})
const error = ref('')
const lookupStatus = ref<'idle' | 'loading' | 'found' | 'not-found'>('idle')

let debounceTimer: ReturnType<typeof setTimeout> | null = null

const rates = computed(() => shop.value?.deliveryRates ?? [])
const fallbackFee = computed(() => Number(shop.value?.deliveryFee) || 0)

function feeLabel(service: DeliveryService) {
  if (!form.value.customerWilaya) return t('common.emDash')
  const fee = deliveryFeeForWilaya(rates.value, form.value.customerWilaya, service, fallbackFee.value)
  return fee === 0 ? t('shop.checkout.free') : formatDzd(fee)
}

const isDelivery = computed(() => form.value.method !== 'PICKUP')

const selectedDeliveryFee = computed(() => {
  if (!isDelivery.value) return 0
  return deliveryFeeForWilaya(
    rates.value,
    form.value.customerWilaya,
    form.value.method as DeliveryService,
    fallbackFee.value,
  )
})

const methodOptions = computed<DeliveryMethodOption<'PICKUP' | DeliveryService>[]>(() => [
  { value: 'PICKUP', label: t('shop.checkout.pickup'), hint: t('shop.checkout.pickupHint'), fee: t('shop.checkout.free') },
  { value: 'STOPDESK', label: t('shop.checkout.stopdesk'), hint: t('shop.checkout.stopdeskHint'), fee: feeLabel('STOPDESK') },
  { value: 'HOME', label: t('shop.checkout.home'), hint: t('shop.checkout.homeHint'), fee: feeLabel('HOME') },
])

const grandTotal = computed(() => cart.total + selectedDeliveryFee.value)

onMounted(async () => {
  const slug = route.params.slug as string
  try {
    const { data } = await api.get<{
      data: { serviceCity: string; deliveryFee: string; deliveryRates?: WilayaDeliveryRate[] }
    }>(`/storefront/${slug}`)
    shop.value = data.data
  } finally {
    loading.value = false
  }
})

watch(
  () => form.value.customerPhone,
  (phone) => {
    if (debounceTimer) clearTimeout(debounceTimer)

    if (!phone?.trim() || phone.trim().length < 6) {
      lookupStatus.value = 'idle'
      return
    }

    lookupStatus.value = 'loading'
    debounceTimer = setTimeout(async () => {
      const slug = route.params.slug as string
      const result = await lookupCustomerByPhoneStorefront(slug, phone)
      if (result) {
        form.value.customerName = result.name
        form.value.customerEmail = result.email ?? ''
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

async function submit() {
  const slug = route.params.slug as string
  error.value = ''
  try {
    const { data } = await api.post<{
      orderNumber: string
      account: CustomerLoginResponse
    }>(`/storefront/${slug}/checkout`, {
      fulfillmentType: isDelivery.value ? 'DELIVERY' : 'PICKUP',
      deliveryService: isDelivery.value ? form.value.method : undefined,
      customerName: form.value.customerName,
      customerPhone: form.value.customerPhone,
      customerEmail: form.value.customerEmail,
      customerWilaya: form.value.customerWilaya,
      deliveryAddress: form.value.deliveryAddress,
      deliveryCity: form.value.deliveryCity || form.value.customerWilaya,
      lines: cart.lines.map((l) => ({ productId: l.productId, quantity: l.quantity })),
    })
    if (data.account) {
      customerAuth.setSession(data.account)
    }
    cart.clear()
    await router.push(`/shop/${slug}/confirmation/${data.orderNumber}`)
  } catch {
    error.value = t('shop.checkout.errorFailed')
  }
}
</script>

<template>
  <div class="flex flex-col gap-10">
    <h1 class="sf-display text-5xl md:text-7xl rtl:text-4xl rtl:md:text-6xl">{{ $t('shop.checkout.title') }}</h1>

    <div class="grid gap-10 lg:grid-cols-12 lg:gap-16">
      <aside class="sf-panel h-fit p-6 md:p-7 lg:order-2 lg:col-span-5" :aria-label="$t('shop.checkout.orderSummary')">
        <h2 class="sf-eyebrow">{{ $t('shop.checkout.orderSummary') }}</h2>
        <ul class="mt-5 flex flex-col gap-3 text-sm">
          <li v-for="line in cart.lines" :key="line.productId" class="flex justify-between gap-4">
            <span class="text-ink">{{ line.name }} <span class="text-mute">× {{ line.quantity }}</span></span>
            <span class="text-ink tabular-nums">{{ formatDzd(Number(line.sellPrice) * line.quantity) }}</span>
          </li>
        </ul>
        <div class="mt-6 flex items-center justify-between border-t border-line pt-5">
          <span class="font-medium text-ink">{{ $t('shop.checkout.total') }}</span>
          <span class="text-lg font-medium text-ink tabular-nums">{{ formatDzd(grandTotal) }}</span>
        </div>
      </aside>

      <div class="lg:order-1 lg:col-span-7">
        <div v-if="loading" class="flex flex-col gap-4" role="status">
          <span class="sr-only">{{ $t('common.loading') }}</span>
          <div v-for="n in 5" :key="n" class="sf-skeleton h-12" />
        </div>

        <form v-else class="flex flex-col gap-5" @submit.prevent="submit">
          <DeliveryMethodPicker
            v-model="form.method"
            name="shop-checkout-method"
            :legend="$t('shop.checkout.stepDelivery')"
            :options="methodOptions"
          />

          <input v-model="form.customerName" :aria-label="$t('shop.checkout.placeholderName')" :placeholder="$t('shop.checkout.placeholderName')" autocomplete="name" required class="sf-input" />
          <div class="relative">
            <input v-model="form.customerPhone" type="tel" :aria-label="$t('shop.checkout.placeholderPhone')" :placeholder="$t('shop.checkout.placeholderPhone')" autocomplete="tel" required class="sf-input" />
            <Loader2
              v-if="lookupStatus === 'loading'"
              class="absolute end-3 top-1/2 h-4 w-4 -translate-y-1/2 animate-spin text-mute"
            />
            <Check
              v-else-if="lookupStatus === 'found'"
              class="absolute end-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ok"
            />
          </div>
          <p v-if="lookupStatus === 'found'" class="-mt-2 text-xs text-ok">
            {{ $t('shop.checkout.welcomeBack') }}
          </p>
          <input v-model="form.customerEmail" type="email" :aria-label="$t('shop.checkout.placeholderEmail')" :placeholder="$t('shop.checkout.placeholderEmail')" autocomplete="email" class="sf-input" />
          <select v-model="form.customerWilaya" :aria-label="$t('shop.checkout.selectWilaya')" required class="sf-input">
            <option value="">{{ $t('shop.checkout.selectWilaya') }}</option>
            <option v-for="wilaya in ALGERIA_WILAYAS" :key="wilaya" :value="wilaya">{{ wilaya }}</option>
          </select>

          <template v-if="form.method === 'HOME'">
            <input v-model="form.deliveryAddress" :aria-label="$t('shop.checkout.placeholderAddress')" :placeholder="$t('shop.checkout.placeholderAddress')" autocomplete="street-address" required class="sf-input" />
            <input
              v-model="form.deliveryCity"
              :aria-label="$t('shop.checkout.placeholderCityMustBe', { city: shop?.serviceCity })"
              :placeholder="$t('shop.checkout.placeholderCityMustBe', { city: shop?.serviceCity })"
              class="sf-input"
            />
          </template>

          <p v-if="error" class="border-s-2 border-alert bg-paper px-4 py-3 text-sm text-alert" role="alert">{{ error }}</p>

          <button type="submit" class="sf-btn mt-2 w-full">
            {{ $t('shop.checkout.placeOrder', { total: grandTotal.toFixed(2) }) }}
          </button>
        </form>
      </div>
    </div>
  </div>
</template>

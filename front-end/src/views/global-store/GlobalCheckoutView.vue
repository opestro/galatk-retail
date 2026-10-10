<script setup lang="ts">
import { ref, computed, onMounted, onBeforeUnmount } from 'vue'
import { useRouter, RouterLink } from 'vue-router'
import { globalCheckout } from '@/services/globalStore'
import { getPublicDeliveryRates } from '@/services/siteSettings'
import { useGlobalStoreCartStore } from '@/stores/globalStoreCart'
import { useCustomerAuthStore } from '@/stores/customerAuth'
import GuestCustomerFields from '@/components/storefront/GuestCustomerFields.vue'
import DeliveryMethodPicker, { type DeliveryMethodOption } from '@/components/storefront/DeliveryMethodPicker.vue'
import ProductThumb from '@/components/storefront/ProductThumb.vue'
import StoreBreadcrumb from '@/components/storefront/StoreBreadcrumb.vue'
import StoreEmptyState from '@/components/storefront/StoreEmptyState.vue'
import {
  checkoutErrorMessage,
  emptyGuestCustomer,
  validateGuestCustomer,
  type GuestCustomerFields as GuestFields,
} from '@/utils/guestCheckout'
import { normalizeAlgerianPhone } from '@/utils/algerianPhone'
import { formatDzd } from '@/utils/formatMoney'
import { deliveryFeeForWilaya } from '@/utils/deliveryFee'
import type { DeliveryService, WilayaDeliveryRate } from '@/types/api'
import { translate } from '@/i18n/translate'
import { ChevronDown, Lock, ShoppingBag } from 'lucide-vue-next'

const router = useRouter()
const cart = useGlobalStoreCartStore()
const customerAuth = useCustomerAuthStore()

const form = ref<GuestFields>(emptyGuestCustomer())
const method = ref<'PICKUP' | DeliveryService>('PICKUP')
const deliveryAddress = ref('')
const fieldErrors = ref({ name: '', phone: '', wilaya: '' })
const error = ref('')
const submitting = ref(false)
const rates = ref<WilayaDeliveryRate[]>([])

if (customerAuth.customer) {
  form.value.customerName = customerAuth.customer.name
  form.value.customerPhone = customerAuth.customer.phone
}

/** Summary is always expanded on desktop; collapsible above the form on mobile. */
const desktopQuery = window.matchMedia('(min-width: 1024px)')
const isDesktop = ref(desktopQuery.matches)
function syncDesktop(event: MediaQueryListEvent) {
  isDesktop.value = event.matches
}
desktopQuery.addEventListener('change', syncDesktop)
onBeforeUnmount(() => desktopQuery.removeEventListener('change', syncDesktop))

onMounted(async () => {
  try {
    rates.value = await getPublicDeliveryRates()
  } catch {
    rates.value = []
  }
})

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

const isDelivery = computed(() => method.value !== 'PICKUP')

function feeLabel(service: DeliveryService) {
  if (!form.value.customerWilaya) return translate('common.emDash')
  const fee = deliveryFeeForWilaya(rates.value, form.value.customerWilaya, service, 0)
  return fee === 0 ? translate('shop.checkout.free') : formatDzd(fee)
}

const selectedDeliveryFee = computed(() => {
  if (!isDelivery.value) return 0
  return deliveryFeeForWilaya(
    rates.value,
    form.value.customerWilaya,
    method.value as DeliveryService,
    0,
  )
})

type CheckoutMethod = 'PICKUP' | DeliveryService

const methodOptions = computed<DeliveryMethodOption<CheckoutMethod>[]>(() => [
  {
    value: 'PICKUP',
    label: translate('shop.checkout.pickup'),
    hint: translate('shop.checkout.pickupHint'),
    fee: translate('shop.checkout.free'),
  },
  { value: 'STOPDESK', label: translate('shop.checkout.stopdesk'), hint: translate('shop.checkout.stopdeskHint'), fee: feeLabel('STOPDESK') },
  { value: 'HOME', label: translate('shop.checkout.home'), hint: translate('shop.checkout.homeHint'), fee: feeLabel('HOME') },
])

const breadcrumb = computed(() => [
  { label: translate('shop.breadcrumb.home'), to: '/store' },
  { label: translate('shop.breadcrumb.bag'), to: { name: 'global-store-cart' } },
  { label: translate('shop.checkout.title') },
])

const shopCount = computed(() => linesByShop.value.size)
const grandTotal = computed(() => cart.total + selectedDeliveryFee.value * shopCount.value)

async function submit() {
  error.value = ''
  const { valid, errors } = validateGuestCustomer(form.value)
  fieldErrors.value = errors
  if (!valid) return
  if (method.value === 'HOME' && !deliveryAddress.value.trim()) {
    error.value = translate('shop.checkout.errorAddress')
    return
  }
  submitting.value = true
  try {
    const phone = normalizeAlgerianPhone(form.value.customerPhone) ?? form.value.customerPhone
    const result = await globalCheckout({
      fulfillmentType: isDelivery.value ? 'DELIVERY' : 'PICKUP',
      deliveryService: isDelivery.value ? (method.value as DeliveryService) : undefined,
      customerName: form.value.customerName.trim(),
      customerPhone: phone,
      customerWilaya: form.value.customerWilaya,
      customerEmail: customerAuth.customer?.email ?? undefined,
      deliveryAddress: method.value === 'HOME' ? deliveryAddress.value.trim() : undefined,
      deliveryCity: form.value.customerWilaya,
      lines: cart.lines.map((l) => ({ productId: l.productId, shopId: l.shopId, quantity: l.quantity })),
    })
    if (result.account) {
      customerAuth.setSession(result.account)
    }
    const total = result.orders.reduce((sum, order) => sum + Number(order.total), 0)
    cart.clear()
    await router.push({
      path: '/store/confirmation',
      query: {
        orders: result.orders.map((o) => o.orderNumber).join(','),
        total: String(total),
        phone,
        wilaya: form.value.customerWilaya,
        name: form.value.customerName.trim(),
      },
    })
  } catch (err) {
    error.value = checkoutErrorMessage(err)
  } finally {
    submitting.value = false
  }
}
</script>

<template>
  <div class="sf-container pb-24 pt-8 md:pt-12">
    <StoreBreadcrumb :items="breadcrumb" />
    <h1 class="sf-display mt-6 text-5xl md:text-7xl rtl:text-4xl rtl:md:text-6xl">{{ $t('shop.checkout.title') }}</h1>

    <StoreEmptyState
      v-if="cart.lines.length === 0"
      :icon="ShoppingBag"
      :title="$t('shop.cart.emptyTitle')"
      :body="$t('shop.cart.emptyBody')"
    >
      <RouterLink :to="{ name: 'global-store-shop' }" class="sf-btn">{{ $t('shop.checkout.browseProducts') }}</RouterLink>
    </StoreEmptyState>

    <div v-else class="mt-12 grid gap-12 md:mt-16 lg:grid-cols-12 lg:gap-20">
      <!-- Summary (collapsible on mobile, sticky column on desktop) -->
      <aside class="lg:order-2 lg:col-span-5" :aria-label="$t('shop.checkout.orderSummary')">
        <details class="group sf-panel lg:sticky lg:top-32" :open="isDesktop">
          <summary
            class="flex min-h-14 cursor-pointer list-none items-center justify-between gap-4 px-5 py-4 md:px-7 lg:pointer-events-none lg:pt-7 [&::-webkit-details-marker]:hidden"
          >
            <span class="sf-eyebrow">
              {{ $t('shop.checkout.showSummary') }}
              <span class="ms-1 normal-case tracking-normal text-mute">({{ $t('shop.checkout.items', cart.itemCount) }})</span>
            </span>
            <span class="flex items-center gap-2 text-sm font-medium text-ink tabular-nums">
              <span class="sf-figure lg:hidden">{{ formatDzd(grandTotal) }}</span>
              <ChevronDown class="h-4 w-4 transition-transform group-open:rotate-180 lg:hidden" stroke-width="1.25" />
            </span>
          </summary>

          <div class="px-5 pb-6 md:px-7 md:pb-7">
            <p
              v-if="linesByShop.size > 1"
              class="mb-5 border-s border-taupe bg-ivory px-4 py-3 text-xs leading-relaxed text-ink-soft"
            >
              {{ $t('shop.checkout.multiShopNotice', { n: linesByShop.size }) }}
            </p>

            <div v-for="[shopId, group] in linesByShop" :key="shopId" class="mb-4 last:mb-0">
              <p v-if="linesByShop.size > 1" class="mb-2 text-xs font-medium text-taupe">{{ group.shopName }}</p>
              <ul class="flex flex-col gap-4">
                <li v-for="line in group.lines" :key="`${line.productId}-${line.shopId}`" class="flex gap-4">
                  <div class="relative h-20 w-16 shrink-0">
                    <ProductThumb :src="line.image" :name="line.name" surface="sand" />
                    <span
                      class="absolute -end-2 -top-2 flex h-5 min-w-5 items-center justify-center rounded-full bg-ink px-1 text-[10px] font-medium text-ivory tabular-nums"
                    >
                      {{ line.quantity }}
                    </span>
                  </div>
                  <div class="min-w-0 flex-1">
                    <p class="sf-name truncate text-[12px]">{{ line.name }}</p>
                    <p v-if="line.variantLabel" class="text-xs text-mute">{{ line.variantLabel }}</p>
                    <p v-if="linesByShop.size === 1" class="text-xs text-mute">{{ line.shopName }}</p>
                  </div>
                  <p class="sf-figure text-[13px] text-ink">{{ formatDzd(Number(line.sellPrice) * line.quantity) }}</p>
                </li>
              </ul>
            </div>

            <RouterLink :to="{ name: 'global-store-cart' }" class="sf-link mt-6">
              {{ $t('shop.checkout.editBag') }}
            </RouterLink>

            <dl class="mt-6 flex flex-col gap-3 border-t border-line pt-6 text-sm">
              <div class="flex items-center justify-between">
                <dt class="text-ink-soft">{{ $t('shop.cart.subtotal') }}</dt>
                <dd class="sf-figure text-[13px] text-ink">{{ formatDzd(cart.total) }}</dd>
              </div>
              <div class="flex items-center justify-between">
                <dt class="text-ink-soft">
                  {{ $t('shop.checkout.delivery') }}
                  <span v-if="shopCount > 1 && selectedDeliveryFee > 0" class="text-mute">× {{ shopCount }}</span>
                </dt>
                <dd class="sf-figure text-[13px] text-ink">
                  {{
                    !isDelivery
                      ? $t('shop.checkout.free')
                      : form.customerWilaya
                        ? formatDzd(selectedDeliveryFee * shopCount)
                        : $t('common.emDash')
                  }}
                </dd>
              </div>
            </dl>
            <div class="mt-5 flex items-center justify-between border-t border-line pt-5">
              <span class="sf-eyebrow text-ink">{{ $t('shop.checkout.total') }}</span>
              <span class="sf-figure text-[17px] font-medium tracking-[0.02em] text-ink">{{ formatDzd(grandTotal) }}</span>
            </div>
          </div>
        </details>
      </aside>

      <!-- Form -->
      <form class="flex flex-col gap-12 lg:order-1 lg:col-span-7" novalidate @submit.prevent="submit">
        <section>
          <h2 class="flex items-center gap-3">
            <span class="font-display text-[1.75rem] font-light leading-none text-taupe tabular-nums" aria-hidden="true">01</span>
            <span class="sf-title text-xl">{{ $t('shop.checkout.stepContact') }}</span>
          </h2>
          <div class="mt-6">
            <p
              v-if="customerAuth.customer"
              class="mb-5 border border-line bg-paper px-4 py-3 text-sm text-ink-soft"
            >
              {{ $t('shop.checkout.orderingAs') }} <span class="font-medium text-ink">{{ customerAuth.customer.name }}</span>
              <span class="text-mute"> · {{ customerAuth.customer.email || customerAuth.customer.phone }}</span>
            </p>
            <GuestCustomerFields v-model="form" :errors="fieldErrors" />
          </div>
        </section>

        <section>
          <h2 class="flex items-center gap-3">
            <span class="font-display text-[1.75rem] font-light leading-none text-taupe tabular-nums" aria-hidden="true">02</span>
            <span class="sf-title text-xl">{{ $t('shop.checkout.stepDelivery') }}</span>
          </h2>
          <div class="mt-6 flex flex-col gap-4">
            <DeliveryMethodPicker
              v-model="method"
              name="checkout-method"
              :legend="$t('shop.checkout.stepDelivery')"
              :options="methodOptions"
            />
            <p v-if="!form.customerWilaya" class="text-xs text-mute">{{ $t('shop.checkout.selectWilayaForFee') }}</p>
            <label v-if="method === 'HOME'" class="flex flex-col gap-1.5">
              <span class="sf-label">{{ $t('shop.checkout.addressLabel') }}</span>
              <input
                v-model="deliveryAddress"
                autocomplete="street-address"
                :placeholder="$t('shop.checkout.placeholderAddress')"
                required
                class="sf-input"
              />
            </label>
          </div>
        </section>

        <div class="flex flex-col gap-4 border-t border-line pt-8">
          <p v-if="error" class="border-s-2 border-alert bg-paper px-4 py-3 text-sm text-alert" role="alert">{{ error }}</p>
          <button type="submit" class="sf-btn w-full min-h-14" :disabled="submitting">
            <Lock class="h-4 w-4" stroke-width="1.25" />
            {{ submitting ? $t('shop.checkout.confirming') : $t('shop.checkout.confirmOrder') }}
            <span v-if="!submitting" class="opacity-70">· {{ formatDzd(grandTotal) }}</span>
          </button>
        </div>
      </form>
    </div>
  </div>
</template>

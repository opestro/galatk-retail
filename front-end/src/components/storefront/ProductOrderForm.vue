<script setup lang="ts">
/**
 * Guest (and signed-in) order form on the product page: name, phone, wilaya,
 * stop-desk vs home delivery, live total including courier fee.
 */
import { computed, onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import { useI18n } from 'vue-i18n'
import GuestCustomerFields from '@/components/storefront/GuestCustomerFields.vue'
import { useCustomerAuthStore } from '@/stores/customerAuth'
import { globalCheckout } from '@/services/globalStore'
import { getPublicDeliveryRates } from '@/services/siteSettings'
import {
  checkoutErrorMessage,
  emptyGuestCustomer,
  validateGuestCustomer,
  type GuestCustomerFields as GuestFields,
} from '@/utils/guestCheckout'
import { normalizeAlgerianPhone } from '@/utils/algerianPhone'
import { deliveryFeeForWilaya } from '@/utils/deliveryFee'
import { formatDzd } from '@/utils/formatMoney'
import type { DeliveryService, WilayaDeliveryRate } from '@/types/api'

const props = defineProps<{
  productId: string
  shopId: string
  sellPrice: string
  quantity: number
  disabled?: boolean
}>()

const { t } = useI18n()
const router = useRouter()
const customerAuth = useCustomerAuthStore()

const form = ref<GuestFields>(emptyGuestCustomer())
const method = ref<DeliveryService>('STOPDESK')
const deliveryAddress = ref('')
const fieldErrors = ref({ name: '', phone: '', wilaya: '' })
const error = ref('')
const submitting = ref(false)
const rates = ref<WilayaDeliveryRate[]>([])

if (customerAuth.customer) {
  form.value.customerName = customerAuth.customer.name
  form.value.customerPhone = customerAuth.customer.phone
}

onMounted(async () => {
  try {
    rates.value = await getPublicDeliveryRates()
  } catch {
    rates.value = []
  }
})

function feeFor(service: DeliveryService) {
  if (!form.value.customerWilaya) return 0
  return deliveryFeeForWilaya(rates.value, form.value.customerWilaya, service, 0)
}

function feeLabel(service: DeliveryService) {
  if (!form.value.customerWilaya) return t('common.emDash')
  const fee = feeFor(service)
  return fee === 0 ? t('shop.checkout.free') : formatDzd(fee)
}

const subtotal = computed(() => Number(props.sellPrice) * props.quantity)
const deliveryFee = computed(() => feeFor(method.value))
const grandTotal = computed(() => subtotal.value + deliveryFee.value)

async function submit() {
  error.value = ''
  if (props.disabled) return
  const { valid, errors } = validateGuestCustomer(form.value)
  fieldErrors.value = errors
  if (!valid) return
  if (method.value === 'HOME' && !deliveryAddress.value.trim()) {
    error.value = t('shop.checkout.errorAddress')
    return
  }

  submitting.value = true
  try {
    const phone = normalizeAlgerianPhone(form.value.customerPhone) ?? form.value.customerPhone
    const result = await globalCheckout({
      fulfillmentType: 'DELIVERY',
      deliveryService: method.value,
      customerName: form.value.customerName.trim(),
      customerPhone: phone,
      customerWilaya: form.value.customerWilaya,
      customerEmail: customerAuth.customer?.email ?? undefined,
      deliveryAddress: method.value === 'HOME' ? deliveryAddress.value.trim() : undefined,
      deliveryCity: form.value.customerWilaya,
      lines: [{ productId: props.productId, shopId: props.shopId, quantity: props.quantity }],
    })
    if (result.account) {
      customerAuth.setSession(result.account)
    }
    const total = result.orders.reduce((sum, order) => sum + Number(order.total), 0)
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
  <form class="flex flex-col gap-4 rounded-xl border border-gray-200 bg-white p-4" @submit.prevent="submit">
    <h2 class="text-sm font-semibold text-gray-900">{{ $t('shop.product.orderFormTitle') }}</h2>

    <GuestCustomerFields v-model="form" :errors="fieldErrors" />

    <div class="flex flex-col gap-2">
      <p class="text-sm font-medium text-gray-900">{{ $t('shop.product.fulfillmentLabel') }}</p>
      <label class="flex items-center gap-2 text-sm text-gray-700">
        <input v-model="method" type="radio" value="STOPDESK" />
        {{ $t('shop.checkout.stopdesk') }}
        <span class="text-gray-500">({{ feeLabel('STOPDESK') }})</span>
      </label>
      <label class="flex items-center gap-2 text-sm text-gray-700">
        <input v-model="method" type="radio" value="HOME" />
        {{ $t('shop.checkout.home') }}
        <span class="text-gray-500">({{ feeLabel('HOME') }})</span>
      </label>
    </div>

    <input
      v-if="method === 'HOME'"
      v-model="deliveryAddress"
      :placeholder="$t('shop.checkout.placeholderAddress')"
      required
      class="input"
    />

    <div class="flex flex-col gap-2 border-t border-gray-100 pt-3 text-sm">
      <div class="flex items-center justify-between text-gray-700">
        <span>{{ $t('shop.product.subtotal') }}</span>
        <span>{{ formatDzd(subtotal) }}</span>
      </div>
      <div class="flex items-center justify-between text-gray-700">
        <span>{{ $t('shop.product.deliveryFee') }}</span>
        <span>{{ form.customerWilaya ? formatDzd(deliveryFee) : $t('common.emDash') }}</span>
      </div>
      <div class="flex items-center justify-between text-base font-semibold text-gray-900">
        <span>{{ $t('shop.checkout.total') }}</span>
        <span>{{ formatDzd(grandTotal) }}</span>
      </div>
    </div>

    <p v-if="error" class="text-sm text-red-600">{{ error }}</p>

    <button type="submit" class="btn-primary w-full" :disabled="disabled || submitting">
      {{
        submitting
          ? $t('shop.checkout.confirming')
          : $t('shop.checkout.placeOrder', { total: grandTotal.toFixed(2) })
      }}
    </button>
  </form>
</template>

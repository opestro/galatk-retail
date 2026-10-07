<script setup lang="ts">
/**
 * Guest (and signed-in) order form on the product page: name, phone, wilaya,
 * stop-desk vs home delivery, live total including courier fee.
 */
import { computed, onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import { useI18n } from 'vue-i18n'
import GuestCustomerFields from '@/components/storefront/GuestCustomerFields.vue'
import DeliveryMethodPicker, { type DeliveryMethodOption } from '@/components/storefront/DeliveryMethodPicker.vue'
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

const methodOptions = computed<DeliveryMethodOption<DeliveryService>[]>(() => [
  { value: 'STOPDESK', label: t('shop.checkout.stopdesk'), hint: t('shop.checkout.stopdeskHint'), fee: feeLabel('STOPDESK') },
  { value: 'HOME', label: t('shop.checkout.home'), hint: t('shop.checkout.homeHint'), fee: feeLabel('HOME') },
])

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
  <form class="flex flex-col gap-6" novalidate @submit.prevent="submit">
    <p class="text-sm text-mute">{{ $t('shop.product.orderDirectlyHint') }}</p>

    <GuestCustomerFields v-model="form" :errors="fieldErrors" />

    <div class="flex flex-col gap-3">
      <p class="sf-label">{{ $t('shop.product.fulfillmentLabel') }}</p>
      <DeliveryMethodPicker
        v-model="method"
        name="direct-order-method"
        :legend="$t('shop.product.fulfillmentLabel')"
        :options="methodOptions"
      />
      <p v-if="!form.customerWilaya" class="text-xs text-mute">{{ $t('shop.checkout.selectWilayaForFee') }}</p>
    </div>

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

    <dl class="flex flex-col gap-2.5 border-t border-line pt-5 text-sm">
      <div class="flex items-center justify-between text-ink-soft">
        <dt>{{ $t('shop.product.subtotal') }}</dt>
        <dd class="tabular-nums">{{ formatDzd(subtotal) }}</dd>
      </div>
      <div class="flex items-center justify-between text-ink-soft">
        <dt>{{ $t('shop.product.deliveryFee') }}</dt>
        <dd class="tabular-nums">{{ form.customerWilaya ? formatDzd(deliveryFee) : $t('common.emDash') }}</dd>
      </div>
      <div class="flex items-center justify-between pt-1 text-base font-medium text-ink">
        <dt>{{ $t('shop.checkout.total') }}</dt>
        <dd class="tabular-nums">{{ formatDzd(grandTotal) }}</dd>
      </div>
    </dl>

    <p v-if="error" class="border-s-2 border-alert bg-paper px-4 py-3 text-sm text-alert" role="alert">{{ error }}</p>

    <button type="submit" class="sf-btn w-full" :disabled="disabled || submitting">
      {{
        submitting
          ? $t('shop.checkout.confirming')
          : $t('shop.checkout.placeOrder', { total: grandTotal.toFixed(2) })
      }}
    </button>
  </form>
</template>

<script setup lang="ts">
import { ref, onMounted, watch, computed } from 'vue'
import { useRoute, RouterLink } from 'vue-router'
import { useI18n } from 'vue-i18n'
import { useAuthStore } from '@/stores/auth'
import type { OnlineOrder, PosProduct, Shop } from '@/types/api'
import PageHeader from '@/components/ui/PageHeader.vue'
import SkeletonForm from '@/components/ui/SkeletonForm.vue'
import OrderCompleteModal from '@/components/pos/OrderCompleteModal.vue'
import {
  addShopOrderLine,
  cancelShopOrder,
  getShopOrder,
  orderStatusLabel,
  removeShopOrderLine,
  selectableOrderStatuses,
  updateShopOrderStatus,
} from '@/services/orders'
import { apiErrorMessage, mediaUrl } from '@/services/products'
import { api } from '@/services/api'
import { formatDzd } from '@/utils/formatMoney'
import { groupByCategory, variantDisplay } from '@/utils/productFamily'
import { saveOrderReceiptPdf } from '@/utils/orderReceiptPdf'
import OrderPaymentBadge from '@/components/orders/OrderPaymentBadge.vue'
import { Plus, Trash2 } from 'lucide-vue-next'

const { t } = useI18n()
const route = useRoute()
const auth = useAuthStore()
const order = ref<OnlineOrder | null>(null)
const shop = ref<Shop | null>(null)
const loading = ref(true)
const error = ref('')
const actionError = ref('')
const savingStatus = ref(false)
const completing = ref(false)
const draftStatus = ref('')
const catalog = ref<PosProduct[]>([])
/** Cascade: family first, then in-stock variant of that family. */
const addFamily = ref('')
const addProductId = ref('')
const addQty = ref(1)
const savingLines = ref(false)

const orderId = computed(() => String(route.params.orderId))

const statusChoices = computed(() => {
  if (!order.value) return []
  const current = order.value.status
  const unique = new Set([current, ...selectableOrderStatuses(current)])
  return [...unique]
})

const canSaveStatus = computed(() => {
  if (!order.value) return false
  return draftStatus.value !== order.value.status && !savingStatus.value
})

const terminal = computed(() =>
  order.value ? ['COMPLETED', 'CANCELLED'].includes(order.value.status) : true,
)

const canEditLines = computed(
  () => Boolean(order.value) && auth.isManager && !terminal.value,
)

/** In-stock POS SKUs the manager can add to an open order. */
const addableProducts = computed(() => catalog.value.filter((product) => product.quantity > 0))
const addFamilies = computed(() => groupByCategory(addableProducts.value))
const addVariants = computed(
  () => addFamilies.value.find((group) => group.category === addFamily.value)?.variants ?? [],
)

function variantOptionLabel(product: PosProduct) {
  return `${variantDisplay(product)} — ${formatDzd(product.sellPrice)} (${product.quantity})`
}

function onAddFamilyChange(event: Event) {
  addFamily.value = (event.target as HTMLSelectElement).value
  addProductId.value = addVariants.value.length === 1 ? addVariants.value[0].productId : ''
}

function onAddVariantChange(event: Event) {
  addProductId.value = (event.target as HTMLSelectElement).value
}

function resetAddForm() {
  addFamily.value = ''
  addProductId.value = ''
  addQty.value = 1
}

function attributeEntries(attrs: Record<string, string> | undefined) {
  return Object.entries(attrs ?? {}).filter(([, value]) => value?.trim())
}

function paymentMethodLabel(method: string) {
  const key = `common.paymentMethod.${method}`
  const label = t(key)
  return label !== key ? label : method.replace(/_/g, ' ')
}

async function load() {
  const shopId = auth.selectedShopId
  if (!shopId) {
    loading.value = false
    return
  }
  loading.value = true
  error.value = ''
  try {
    const [loaded, shopRes] = await Promise.all([
      getShopOrder(shopId, orderId.value),
      api.get<{ data: Shop }>(`/shops/${shopId}`).catch(() => null),
    ])
    order.value = loaded
    draftStatus.value = loaded.status
    shop.value = shopRes?.data.data ?? null
    if (auth.isManager) {
      try {
        const { data } = await api.get<{ data: PosProduct[] }>(`/shops/${shopId}/pos/products`)
        catalog.value = data.data
      } catch {
        catalog.value = []
      }
    }
  } catch {
    error.value = t('admin.orderDetail.notFound')
    order.value = null
  } finally {
    loading.value = false
  }
}

async function saveStatus() {
  const shopId = auth.selectedShopId
  if (!shopId || !order.value) return

  const next = draftStatus.value
  actionError.value = ''

  if (next === 'COMPLETED') {
    completing.value = true
    draftStatus.value = order.value.status
    return
  }

  if (next === 'CANCELLED') {
    if (!auth.isManager) {
      actionError.value = t('admin.orderDetail.cancelManagerOnly')
      draftStatus.value = order.value.status
      return
    }
    if (!window.confirm(t('admin.orderDetail.confirmCancel'))) {
      draftStatus.value = order.value.status
      return
    }
  }

  savingStatus.value = true
  try {
    if (next === 'CANCELLED') {
      order.value = await cancelShopOrder(shopId, order.value.id, t('admin.orderDetail.cancelReason'))
    } else {
      order.value = await updateShopOrderStatus(shopId, order.value.id, next)
    }
    draftStatus.value = order.value.status
  } catch (err) {
    actionError.value = apiErrorMessage(err, t('admin.orderDetail.statusUpdateError'))
    draftStatus.value = order.value.status
  } finally {
    savingStatus.value = false
  }
}

function downloadReceipt() {
  if (!order.value) return
  try {
    saveOrderReceiptPdf(order.value, shop.value)
  } catch (err) {
    actionError.value = err instanceof Error ? err.message : t('admin.orderDetail.receiptError')
  }
}

async function addProduct() {
  const shopId = auth.selectedShopId
  if (!shopId || !order.value || !addProductId.value || savingLines.value) return
  savingLines.value = true
  actionError.value = ''
  try {
    order.value = await addShopOrderLine(shopId, order.value.id, {
      productId: addProductId.value,
      quantity: addQty.value,
    })
    resetAddForm()
    const { data } = await api.get<{ data: PosProduct[] }>(`/shops/${shopId}/pos/products`)
    catalog.value = data.data
  } catch (err) {
    actionError.value = apiErrorMessage(err, t('admin.orderDetail.lineUpdateError'))
  } finally {
    savingLines.value = false
  }
}

async function removeLine(lineId: string) {
  const shopId = auth.selectedShopId
  if (!shopId || !order.value || savingLines.value) return
  if ((order.value.lines?.length ?? 0) <= 1) {
    actionError.value = t('admin.orderDetail.lastLine')
    return
  }
  if (!window.confirm(t('admin.orderDetail.confirmRemove'))) return
  savingLines.value = true
  actionError.value = ''
  try {
    order.value = await removeShopOrderLine(shopId, order.value.id, lineId)
    const { data } = await api.get<{ data: PosProduct[] }>(`/shops/${shopId}/pos/products`)
    catalog.value = data.data
  } catch (err) {
    actionError.value = apiErrorMessage(err, t('admin.orderDetail.lineUpdateError'))
  } finally {
    savingLines.value = false
  }
}

onMounted(load)
watch(() => [auth.selectedShopId, orderId.value], load)
</script>

<template>
  <div class="page-shell">
    <PageHeader :title="t('admin.orderDetail.title')">
      <template #actions>
        <button type="button" class="btn-secondary text-sm" :disabled="!order" @click="downloadReceipt">
          {{ t('admin.orderDetail.savePdf') }}
        </button>
        <RouterLink to="/admin/orders" class="btn-secondary text-sm">{{ t('admin.orderDetail.back') }}</RouterLink>
      </template>
    </PageHeader>

    <SkeletonForm v-if="loading" :fields="6" />
    <p v-else-if="error" class="text-sm text-red-600">{{ error }}</p>

    <div v-else-if="order" class="flex flex-col gap-5">
      <section class="card flex flex-col gap-4">
        <div class="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2 class="text-lg font-semibold text-gray-900">{{ order.orderNumber }}</h2>
            <p class="text-xs text-gray-500">{{ new Date(order.createdAt).toLocaleString() }}</p>
            <p class="mt-1 text-xs text-gray-500">
              {{ order.fulfillmentType === 'PICKUP' ? t('admin.orderDetail.pickup') : t('admin.orderDetail.delivery') }}
              <span v-if="order.deliveryService">
                · {{ t(`common.deliveryService.${order.deliveryService}`) }}
              </span>
              <span v-if="order.paymentMethod"> · {{ paymentMethodLabel(order.paymentMethod) }}</span>
            </p>
          </div>
          <span class="rounded-md border border-gray-200 px-2 py-1 text-sm text-gray-700">
            {{ orderStatusLabel(order.status) }}
          </span>
        </div>
        <OrderPaymentBadge :order="order" />

        <div v-if="!terminal" class="flex flex-col gap-2 sm:flex-row sm:items-end">
          <label class="flex flex-1 flex-col gap-1.5 text-sm text-gray-700">
            {{ t('admin.orderDetail.changeStatus') }}
            <select v-model="draftStatus" class="input">
              <option v-for="status in statusChoices" :key="status" :value="status">
                {{ orderStatusLabel(status) }}{{ status === 'COMPLETED' ? ` ${t('admin.orderDetail.collectPaymentSuffix')}` : '' }}
              </option>
            </select>
          </label>
          <button
            type="button"
            class="btn-primary"
            :disabled="!canSaveStatus"
            @click="saveStatus"
          >
            {{ savingStatus ? t('common.saving') : t('admin.orderDetail.saveStatus') }}
          </button>
        </div>
        <p v-if="actionError" class="text-sm text-red-600">{{ actionError }}</p>
      </section>

      <section class="card flex flex-col gap-2">
        <h3 class="text-sm font-semibold text-gray-900">{{ t('admin.orderDetail.customer') }}</h3>
        <p class="text-sm text-gray-800"><span class="text-gray-500">{{ t('admin.orderDetail.fieldName') }}</span> {{ order.customerName }}</p>
        <p class="text-sm text-gray-800"><span class="text-gray-500">{{ t('admin.orderDetail.fieldPhone') }}</span> {{ order.customerPhone }}</p>
        <p v-if="order.customerEmail" class="text-sm text-gray-800">
          <span class="text-gray-500">{{ t('admin.orderDetail.fieldEmail') }}</span> {{ order.customerEmail }}
        </p>
        <p class="text-sm text-gray-800">
          <span class="text-gray-500">{{ t('admin.orderDetail.fieldWilaya') }}</span> {{ order.customerWilaya || order.deliveryCity || t('common.emDash') }}
        </p>
        <p v-if="order.deliveryAddress" class="text-sm text-gray-800">
          <span class="text-gray-500">{{ t('admin.orderDetail.fieldAddress') }}</span> {{ order.deliveryAddress }}
        </p>
        <p v-if="order.client" class="text-sm text-gray-800">
          <span class="text-gray-500">{{ t('admin.orderDetail.clientBalance') }}</span>
          {{ formatDzd(order.client.balance ?? '0') }}
          <RouterLink
            :to="`/admin/clients/${order.client.id}`"
            class="ms-2 text-xs font-medium text-gray-700 underline"
          >
            {{ t('admin.orderDetail.openClient') }}
          </RouterLink>
        </p>
      </section>

      <section class="overflow-hidden rounded-lg border border-gray-200">
        <h3 class="border-b border-gray-200 bg-gray-50 px-4 py-3 text-sm font-semibold text-gray-900">
          {{ t('admin.orderDetail.products') }}
        </h3>
        <ul class="divide-y divide-gray-100">
          <li
            v-for="line in order.lines"
            :key="line.id"
            class="flex flex-col gap-3 px-4 py-4 sm:flex-row sm:items-start sm:justify-between"
          >
            <div class="flex min-w-0 gap-3">
              <div class="h-16 w-16 shrink-0 overflow-hidden rounded-md border border-gray-200 bg-gray-50">
                <img
                  v-if="line.imageUrl"
                  :src="mediaUrl(line.imageUrl)"
                  :alt="line.productName"
                  class="h-full w-full object-cover"
                />
              </div>
              <div class="min-w-0">
                <p class="font-medium text-gray-900">
                  <RouterLink
                    v-if="line.familyId"
                    :to="`/admin/products/${line.familyId}`"
                    class="hover:underline"
                  >
                    {{ line.productName }}
                  </RouterLink>
                  <span v-else>{{ line.productName }}</span>
                </p>
                <p v-if="line.variantLabel" class="text-sm text-gray-600">{{ line.variantLabel }}</p>
                <p v-if="line.sku" class="text-xs text-gray-500">{{ t('admin.orderDetail.sku', { sku: line.sku }) }}</p>
                <p v-if="attributeEntries(line.attributes).length" class="mt-1 flex flex-wrap gap-1">
                  <span
                    v-for="[key, value] in attributeEntries(line.attributes)"
                    :key="key"
                    class="rounded border border-gray-200 px-1.5 py-0.5 text-xs text-gray-600"
                  >
                    {{ key }}: {{ value }}
                  </span>
                </p>
                <p class="mt-1 text-xs text-gray-500">{{ t('admin.orderDetail.qtyEach', { n: line.quantity, price: formatDzd(line.unitPrice) }) }}</p>
              </div>
            </div>
            <div class="flex shrink-0 flex-col items-end gap-2">
              <p class="text-sm font-medium text-gray-900">{{ formatDzd(line.lineTotal) }}</p>
              <button
                v-if="canEditLines"
                type="button"
                class="btn-secondary px-2 py-1 text-xs text-red-700"
                :disabled="savingLines || (order.lines?.length ?? 0) <= 1"
                @click="removeLine(line.id)"
              >
                <Trash2 class="me-1 inline h-3.5 w-3.5" />
                {{ t('admin.orderDetail.removeLine') }}
              </button>
            </div>
          </li>
        </ul>
        <div v-if="canEditLines" class="flex flex-col gap-3 border-t border-gray-200 px-4 py-3">
          <p class="text-sm font-medium text-gray-800">{{ t('admin.orderDetail.editProducts') }}</p>
          <p v-if="!addableProducts.length" class="text-sm text-gray-500">{{ t('admin.orderDetail.selectProduct') }}</p>
          <div v-else class="flex flex-col gap-2 sm:flex-row sm:items-end">
            <label class="flex min-w-0 flex-1 flex-col gap-1 text-sm text-gray-700">
              {{ t('admin.orderDetail.selectFamily') }}
              <select
                class="input"
                :value="addFamily"
                :disabled="savingLines"
                @change="onAddFamilyChange"
              >
                <option value="">{{ t('admin.orderDetail.selectFamily') }}</option>
                <option v-for="group in addFamilies" :key="group.category" :value="group.category">
                  {{ group.category }}
                </option>
              </select>
            </label>
            <label class="flex min-w-0 flex-1 flex-col gap-1 text-sm text-gray-700">
              {{ t('admin.orderDetail.selectVariant') }}
              <select
                class="input"
                :value="addProductId"
                :disabled="savingLines || !addFamily"
                @change="onAddVariantChange"
              >
                <option value="">{{ t('admin.orderDetail.selectVariant') }}</option>
                <option
                  v-for="product in addVariants"
                  :key="product.productId"
                  :value="product.productId"
                >
                  {{ variantOptionLabel(product) }}
                </option>
              </select>
            </label>
            <label class="flex w-24 flex-col gap-1 text-sm text-gray-700">
              {{ t('admin.orderDetail.qty') }}
              <input v-model.number="addQty" type="number" min="1" class="input" :disabled="savingLines" />
            </label>
            <button
              type="button"
              class="btn-primary"
              :disabled="savingLines || !addProductId || addQty < 1"
              @click="addProduct"
            >
              <Plus class="me-1 inline h-4 w-4" />
              {{ t('admin.orderDetail.addProduct') }}
            </button>
          </div>
        </div>
        <div class="flex flex-col gap-1 border-t border-gray-200 px-4 py-3 text-sm text-gray-700">
          <div v-if="order.subtotal" class="flex justify-between">
            <span>{{ t('admin.orderDetail.subtotal') }}</span>
            <span>{{ formatDzd(order.subtotal) }}</span>
          </div>
          <div v-if="order.deliveryFee && Number(order.deliveryFee) > 0" class="flex justify-between">
            <span>{{ t('admin.orderDetail.deliveryFee') }}</span>
            <span>{{ formatDzd(order.deliveryFee) }}</span>
          </div>
          <div class="flex justify-between font-semibold text-gray-900">
            <span>{{ t('admin.orderDetail.total') }}</span>
            <span>{{ formatDzd(order.total) }}</span>
          </div>
          <template v-if="order.paymentStatus && order.paymentStatus !== 'NONE'">
            <div class="flex justify-between">
              <span>{{ t('admin.orderDetail.amountCollected') }}</span>
              <span>{{ formatDzd(order.collected ?? '0') }}</span>
            </div>
            <div
              v-if="order.paymentStatus === 'PARTIAL' || order.paymentStatus === 'CREDIT'"
              class="flex justify-between text-amber-800"
            >
              <span>{{ t('admin.orderDetail.remainingOnCredit') }}</span>
              <span>{{ formatDzd(order.remainingCredit ?? order.total) }}</span>
            </div>
          </template>
        </div>
      </section>
    </div>

    <OrderCompleteModal
      v-if="completing && order"
      :order="order"
      @close="completing = false"
      @completed="completing = false; load()"
    />
  </div>
</template>

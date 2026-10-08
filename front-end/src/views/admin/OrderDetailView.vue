<script setup lang="ts">
import { ref, onMounted, watch, computed } from 'vue'
import { useRoute, RouterLink } from 'vue-router'
import { useI18n } from 'vue-i18n'
import { useAuthStore } from '@/stores/auth'
import type { OnlineOrder, PosProduct, Shop } from '@/types/api'
import PageHeader from '@/components/ui/PageHeader.vue'
import OrderCompleteModal from '@/components/pos/OrderCompleteModal.vue'
import PosStatusBadge from '@/components/pos/PosStatusBadge.vue'
import PosRowMenu from '@/components/pos/PosRowMenu.vue'
import AdminConfirm from '@/components/admin/AdminConfirm.vue'
import { useToast } from '@/composables/useToast'
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
import { formatCount, formatDateTime, formatMoney } from '@/utils/formatMoney'
import { groupByCategory, variantDisplay } from '@/utils/productFamily'
import { saveOrderReceiptPdf } from '@/utils/orderReceiptPdf'
import { AlertCircle, ExternalLink, FileDown, Mail, MapPin, Phone, Plus, Shirt, Store, Trash2, Truck, UserRound } from 'lucide-vue-next'

const { t } = useI18n()
const route = useRoute()
const auth = useAuthStore()
const toast = useToast()
const confirmCancel = ref(false)
const removeLineId = ref<string | null>(null)
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
  return `${variantDisplay(product)} — ${formatMoney(product.sellPrice)} (${product.quantity})`
}

function onAddFamilyChange(event: Event) {
  addFamily.value = (event.target as HTMLSelectElement).value
  addProductId.value = addVariants.value.length === 1 ? addVariants.value[0]!.productId : ''
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
    if (!confirmCancel.value) {
      confirmCancel.value = true
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
    toast.success(t('admin.orderDetail.statusSaved', { status: orderStatusLabel(order.value.status) }))
  } catch (err) {
    actionError.value = apiErrorMessage(err, t('admin.orderDetail.statusUpdateError'))
    draftStatus.value = order.value.status
  } finally {
    savingStatus.value = false
    confirmCancel.value = false
  }
}

function dismissCancel() {
  confirmCancel.value = false
  if (order.value) draftStatus.value = order.value.status
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
    toast.success(t('admin.orderDetail.lineAdded'))
    const { data } = await api.get<{ data: PosProduct[] }>(`/shops/${shopId}/pos/products`)
    catalog.value = data.data
  } catch (err) {
    actionError.value = apiErrorMessage(err, t('admin.orderDetail.lineUpdateError'))
  } finally {
    savingLines.value = false
  }
}

function removeLine(lineId: string) {
  if (!order.value || savingLines.value) return
  if ((order.value.lines?.length ?? 0) <= 1) {
    actionError.value = t('admin.orderDetail.lastLine')
    return
  }
  removeLineId.value = lineId
}

async function confirmRemoveLine() {
  const shopId = auth.selectedShopId
  const lineId = removeLineId.value
  if (!shopId || !order.value || !lineId || savingLines.value) return
  savingLines.value = true
  actionError.value = ''
  try {
    order.value = await removeShopOrderLine(shopId, order.value.id, lineId)
    toast.success(t('admin.orderDetail.lineRemoved'))
    const { data } = await api.get<{ data: PosProduct[] }>(`/shops/${shopId}/pos/products`)
    catalog.value = data.data
  } catch (err) {
    actionError.value = apiErrorMessage(err, t('admin.orderDetail.lineUpdateError'))
  } finally {
    savingLines.value = false
    removeLineId.value = null
  }
}

onMounted(load)
watch(() => [auth.selectedShopId, orderId.value], load)
</script>

<template>
  <div class="page-shell">
    <div v-if="loading" class="flex flex-col gap-6" role="status">
      <span class="sr-only">{{ t('common.loading') }}</span>
      <div class="pos-skeleton h-8 w-56" />
      <div class="grid gap-6 lg:grid-cols-[minmax(0,1fr)_22rem]">
        <div class="pos-skeleton h-96 rounded-2xl" />
        <div class="flex flex-col gap-6">
          <div class="pos-skeleton h-48 rounded-2xl" />
          <div class="pos-skeleton h-40 rounded-2xl" />
        </div>
      </div>
    </div>

    <template v-else-if="error">
      <PageHeader back="/admin/orders" :back-label="t('admin.orderDetail.back')" />
      <p class="pos-notice bg-pos-err-bg text-pos-err" role="alert">
        <AlertCircle class="mt-px h-4 w-4 shrink-0" />
        {{ error }}
      </p>
    </template>

    <template v-else-if="order">
      <PageHeader :title="order.orderNumber" back="/admin/orders" :back-label="t('admin.orderDetail.back')">
        <template #subtitle>
          <span class="pos-num">{{ formatDateTime(order.createdAt).date }} · {{ formatDateTime(order.createdAt).time }}</span>
        </template>
        <template #actions>
          <PosStatusBadge :status="order.status" :label="orderStatusLabel(order.status)" />
          <button type="button" class="pos-btn-soft" @click="downloadReceipt">
            <FileDown class="h-4 w-4" />
            {{ t('admin.orderDetail.savePdf') }}
          </button>
        </template>
      </PageHeader>

      <p v-if="actionError" class="pos-notice bg-pos-err-bg text-pos-err" role="alert">
        <AlertCircle class="mt-px h-4 w-4 shrink-0" />
        {{ actionError }}
      </p>

      <div class="grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_22rem]">
        <!-- Products & totals -->
        <section class="pos-surface overflow-hidden">
          <header class="flex items-center justify-between px-6 pt-5 pb-3">
            <h2 class="section-title">{{ t('admin.orderDetail.products') }}</h2>
            <span class="pos-badge-neutral pos-num">{{ t('admin.orderDetail.itemCount', { n: formatCount(order.lines?.length ?? 0) }, order.lines?.length ?? 0) }}</span>
          </header>
          <ul>
            <li v-for="line in order.lines" :key="line.id" class="flex gap-4 border-t border-pos-line/70 px-6 py-4">
              <span class="flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-pos-sunken">
                <img v-if="line.imageUrl" :src="mediaUrl(line.imageUrl)" :alt="line.productName" class="h-full w-full object-cover" />
                <Shirt v-else class="h-5 w-5 text-pos-faint" aria-hidden="true" />
              </span>
              <div class="min-w-0 flex-1">
                <div class="flex items-start justify-between gap-3">
                  <div class="min-w-0">
                    <RouterLink v-if="line.familyId" :to="`/admin/products/${line.familyId}`" class="font-medium text-pos-ink hover:underline">
                      {{ line.productName }}
                    </RouterLink>
                    <p v-else class="font-medium text-pos-ink">{{ line.productName }}</p>
                    <p v-if="line.variantLabel" class="text-[13px] text-pos-muted">{{ line.variantLabel }}</p>
                  </div>
                  <div class="flex shrink-0 items-start gap-1">
                    <p class="pt-0.5 font-semibold text-pos-ink pos-num">{{ formatMoney(line.lineTotal) }}</p>
                    <PosRowMenu v-if="canEditLines" :label="t('pos.table.moreActions')">
                      <button
                        type="button"
                        role="menuitem"
                        class="pos-menu-item pos-menu-item-danger"
                        :disabled="savingLines || (order.lines?.length ?? 0) <= 1"
                        @click="removeLine(line.id)"
                      >
                        <Trash2 class="h-4 w-4" />
                        {{ t('admin.orderDetail.removeLine') }}
                      </button>
                    </PosRowMenu>
                  </div>
                </div>
                <div class="mt-1.5 flex flex-wrap items-center gap-1.5">
                  <span class="text-[12.5px] text-pos-muted pos-num">{{ t('admin.orderDetail.qtyEach', { n: formatCount(line.quantity), price: formatMoney(line.unitPrice) }) }}</span>
                  <span v-if="line.sku" class="pos-badge-neutral h-5 px-2 text-[11px]">{{ t('admin.orderDetail.sku', { sku: line.sku }) }}</span>
                  <span
                    v-for="[key, value] in attributeEntries(line.attributes)"
                    :key="key"
                    class="pos-badge-neutral h-5 px-2 text-[11px]"
                  >
                    {{ key }}: {{ value }}
                  </span>
                </div>
              </div>
            </li>
          </ul>

          <!-- Add product -->
          <div v-if="canEditLines" class="flex flex-col gap-3 border-t border-pos-line bg-pos-sunken/60 px-6 py-5">
            <h3 class="pos-label">{{ t('admin.orderDetail.editProducts') }}</h3>
            <p v-if="!addableProducts.length" class="text-[13px] text-pos-muted">{{ t('admin.orderDetail.selectProduct') }}</p>
            <div v-else class="grid gap-3 sm:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_6rem_auto] sm:items-end">
              <label class="pos-field">
                <span class="pos-label">{{ t('admin.orderDetail.selectFamily') }}</span>
                <select class="pos-input" :value="addFamily" :disabled="savingLines" @change="onAddFamilyChange">
                  <option value="">{{ t('admin.orderDetail.selectFamily') }}</option>
                  <option v-for="group in addFamilies" :key="group.category" :value="group.category">{{ group.category }}</option>
                </select>
              </label>
              <label class="pos-field">
                <span class="pos-label">{{ t('admin.orderDetail.selectVariant') }}</span>
                <select class="pos-input" :value="addProductId" :disabled="savingLines || !addFamily" @change="onAddVariantChange">
                  <option value="">{{ t('admin.orderDetail.selectVariant') }}</option>
                  <option v-for="product in addVariants" :key="product.productId" :value="product.productId">
                    {{ variantOptionLabel(product) }}
                  </option>
                </select>
              </label>
              <label class="pos-field">
                <span class="pos-label">{{ t('admin.orderDetail.qty') }}</span>
                <input v-model.number="addQty" type="number" inputmode="numeric" min="1" class="pos-input pos-num" :disabled="savingLines" />
              </label>
              <button type="button" class="pos-btn-primary" :disabled="savingLines || !addProductId || addQty < 1" @click="addProduct">
                <Plus class="h-4 w-4" />
                {{ t('admin.orderDetail.addProduct') }}
              </button>
            </div>
          </div>

          <!-- Totals -->
          <dl class="flex flex-col gap-2 border-t border-pos-line px-6 py-5 text-[13.5px]">
            <div v-if="order.subtotal" class="flex justify-between text-pos-muted">
              <dt>{{ t('admin.orderDetail.subtotal') }}</dt>
              <dd class="pos-num">{{ formatMoney(order.subtotal) }}</dd>
            </div>
            <div v-if="order.deliveryFee && Number(order.deliveryFee) > 0" class="flex justify-between text-pos-muted">
              <dt>{{ t('admin.orderDetail.deliveryFee') }}</dt>
              <dd class="pos-num">{{ formatMoney(order.deliveryFee) }}</dd>
            </div>
            <div class="mt-1 flex items-baseline justify-between text-pos-ink">
              <dt class="font-medium">{{ t('admin.orderDetail.total') }}</dt>
              <dd class="text-[22px] font-semibold tracking-[-0.02em] pos-num">{{ formatMoney(order.total) }}</dd>
            </div>
          </dl>
        </section>

        <!-- Side column -->
        <div class="flex flex-col gap-6">
          <section class="pos-surface flex flex-col gap-4 p-5">
            <h2 class="section-title">{{ t('admin.orderDetail.statusSection') }}</h2>
            <template v-if="!terminal">
              <label class="pos-field">
                <span class="pos-label">{{ t('admin.orderDetail.changeStatus') }}</span>
                <select v-model="draftStatus" class="pos-input">
                  <option v-for="status in statusChoices" :key="status" :value="status">
                    {{ orderStatusLabel(status) }}{{ status === 'COMPLETED' ? ` ${t('admin.orderDetail.collectPaymentSuffix')}` : '' }}
                  </option>
                </select>
              </label>
              <button type="button" class="pos-btn-primary w-full" :disabled="!canSaveStatus" @click="saveStatus">
                {{ savingStatus ? t('common.saving') : t('admin.orderDetail.saveStatus') }}
              </button>
            </template>
            <p v-else class="text-[13px] text-pos-muted">{{ t('admin.orderDetail.statusFinal') }}</p>

            <div class="flex flex-col gap-2 border-t border-pos-line pt-4 text-[13px]">
              <div class="flex items-center justify-between gap-3">
                <span class="text-pos-muted">{{ t('admin.orders.colPayment') }}</span>
                <PosStatusBadge
                  v-if="order.paymentStatus && order.paymentStatus !== 'NONE'"
                  :status="order.paymentStatus"
                  :label="t(`common.paymentStatus.${order.paymentStatus}`, { paid: formatMoney(order.collected ?? '0'), remaining: formatMoney(order.remainingCredit ?? order.total) })"
                />
                <span v-else class="text-pos-ink-2">{{ order.paymentMethod ? paymentMethodLabel(order.paymentMethod) : t('common.emDash') }}</span>
              </div>
              <template v-if="order.paymentStatus && order.paymentStatus !== 'NONE'">
                <div class="flex justify-between">
                  <span class="text-pos-muted">{{ t('admin.orderDetail.amountCollected') }}</span>
                  <span class="font-medium text-pos-ink pos-num">{{ formatMoney(order.collected ?? '0') }}</span>
                </div>
                <div v-if="order.paymentStatus === 'PARTIAL' || order.paymentStatus === 'CREDIT'" class="flex justify-between text-pos-warn">
                  <span>{{ t('admin.orderDetail.remainingOnCredit') }}</span>
                  <span class="font-medium pos-num">{{ formatMoney(order.remainingCredit ?? order.total) }}</span>
                </div>
              </template>
            </div>
          </section>

          <section class="pos-surface flex flex-col gap-4 p-5">
            <h2 class="section-title">{{ t('admin.orderDetail.customer') }}</h2>
            <div class="flex items-center gap-3">
              <span class="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-pos-canvas text-pos-muted">
                <UserRound class="h-[18px] w-[18px]" />
              </span>
              <div class="min-w-0">
                <p class="truncate font-medium text-pos-ink">{{ order.customerName }}</p>
                <p class="text-[12.5px] text-pos-muted">
                  <Store v-if="order.fulfillmentType === 'PICKUP'" class="inline h-3.5 w-3.5 align-[-2px]" />
                  <Truck v-else class="inline h-3.5 w-3.5 align-[-2px]" />
                  {{ order.fulfillmentType === 'PICKUP' ? t('admin.orderDetail.pickup') : t('admin.orderDetail.delivery') }}
                  <template v-if="order.deliveryService"> · {{ t(`common.deliveryService.${order.deliveryService}`) }}</template>
                </p>
              </div>
            </div>
            <ul class="flex flex-col gap-2.5 text-[13.5px] text-pos-ink-2">
              <li class="flex items-center gap-2.5">
                <Phone class="h-4 w-4 shrink-0 text-pos-faint" />
                <a :href="`tel:${order.customerPhone}`" class="hover:underline"><bdi>{{ order.customerPhone }}</bdi></a>
              </li>
              <li v-if="order.customerEmail" class="flex items-center gap-2.5">
                <Mail class="h-4 w-4 shrink-0 text-pos-faint" />
                <span class="truncate">{{ order.customerEmail }}</span>
              </li>
              <li class="flex items-start gap-2.5">
                <MapPin class="mt-0.5 h-4 w-4 shrink-0 text-pos-faint" />
                <span>
                  {{ order.customerWilaya || order.deliveryCity || t('common.emDash') }}
                  <span v-if="order.deliveryAddress" class="block text-pos-muted">{{ order.deliveryAddress }}</span>
                </span>
              </li>
            </ul>
            <div v-if="order.client" class="flex items-center justify-between gap-3 rounded-xl bg-pos-sunken px-3.5 py-3">
              <div>
                <p class="text-[12px] text-pos-muted">{{ t('admin.orderDetail.clientBalance') }}</p>
                <p class="font-semibold pos-num" :class="Number(order.client.balance) > 0 ? 'text-pos-warn' : 'text-pos-ink'">
                  {{ formatMoney(order.client.balance ?? '0') }}
                </p>
              </div>
              <RouterLink :to="`/admin/clients/${order.client.id}`" class="pos-btn-soft pos-btn-sm">
                {{ t('admin.orderDetail.openClient') }}
                <ExternalLink class="h-3.5 w-3.5 rtl:-scale-x-100" />
              </RouterLink>
            </div>
          </section>
        </div>
      </div>
    </template>

    <OrderCompleteModal
      v-if="completing && order"
      :order="order"
      @close="completing = false"
      @completed="completing = false; load()"
    />

    <AdminConfirm
      v-if="confirmCancel"
      :title="t('admin.orderDetail.cancelTitle')"
      :body="t('admin.orderDetail.confirmCancel')"
      :confirm-label="t('admin.orderDetail.cancelOrder')"
      danger
      :busy="savingStatus"
      @close="dismissCancel"
      @confirm="saveStatus"
    />

    <AdminConfirm
      v-if="removeLineId"
      :title="t('admin.orderDetail.removeTitle')"
      :body="t('admin.orderDetail.confirmRemove')"
      :confirm-label="t('admin.orderDetail.removeLine')"
      danger
      :busy="savingLines"
      @close="removeLineId = null"
      @confirm="confirmRemoveLine"
    />
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useI18n } from 'vue-i18n'
import { AlertCircle, MapPin, Plus, Store, Truck } from 'lucide-vue-next'
import { api } from '@/services/api'
import { apiErrorMessage } from '@/services/products'
import type { Shop } from '@/types/api'
import PageHeader from '@/components/ui/PageHeader.vue'
import PosModal from '@/components/pos/PosModal.vue'
import PosEmptyState from '@/components/pos/PosEmptyState.vue'
import { useToast } from '@/composables/useToast'
import { useAuthStore } from '@/stores/auth'
import { formatCount, formatMoney } from '@/utils/formatMoney'

const { t } = useI18n()
const auth = useAuthStore()
const toast = useToast()
const shops = ref<Shop[]>([])
const loading = ref(true)
const showForm = ref(false)
const saving = ref(false)
const error = ref('')

function emptyForm() {
  return { name: '', slug: '', address: '', serviceCity: '', deliveryFee: 0 }
}
const form = ref(emptyForm())

async function loadShops() {
  loading.value = !shops.value.length
  try {
    const { data } = await api.get<{ data: Shop[] }>('/shops')
    shops.value = data.data
  } finally {
    loading.value = false
  }
}

function openForm() {
  form.value = emptyForm()
  error.value = ''
  showForm.value = true
}

async function createShop() {
  if (saving.value) return
  saving.value = true
  error.value = ''
  try {
    await api.post('/shops', { ...form.value, deliveryFee: Number(form.value.deliveryFee) })
    showForm.value = false
    toast.success(t('admin.shops.created'))
    await loadShops()
  } catch (e) {
    error.value = apiErrorMessage(e, t('admin.shops.createFailed'))
  } finally {
    saving.value = false
  }
}

onMounted(loadShops)
</script>

<template>
  <div class="page-shell">
    <PageHeader
      :title="t('admin.shops.title')"
      :subtitle="loading ? '' : t('admin.shops.subtitle', { n: formatCount(shops.length) }, shops.length)"
    >
      <template #actions>
        <button type="button" class="pos-btn-primary" @click="openForm">
          <Plus class="h-4 w-4" />
          {{ t('admin.shops.add') }}
        </button>
      </template>
    </PageHeader>

    <div v-if="loading" class="grid gap-4 sm:grid-cols-2 xl:grid-cols-3" role="status">
      <span class="sr-only">{{ t('common.loading') }}</span>
      <div v-for="i in 3" :key="i" class="pos-skeleton h-40 rounded-2xl" />
    </div>

    <div v-else-if="shops.length" class="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
      <article
        v-for="(shop, index) in shops"
        :key="shop.id"
        class="pos-surface pos-rise flex flex-col gap-4 p-5"
        :style="{ '--i': index }"
      >
        <div class="flex items-start gap-3">
          <span class="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-pos-canvas text-pos-ink-2">
            <Store class="h-[18px] w-[18px]" />
          </span>
          <div class="min-w-0 flex-1">
            <h2 class="truncate text-[15px] font-semibold text-pos-ink">{{ shop.name }}</h2>
            <p class="truncate text-[12px] text-pos-muted" dir="ltr" style="font-family: var(--font-pos-mono)">/{{ shop.slug }}</p>
          </div>
          <span v-if="shop.id === auth.selectedShopId" class="pos-badge-ok h-5 px-2 text-[11px]"><span class="pos-dot" />{{ t('admin.shops.active') }}</span>
        </div>
        <dl class="flex flex-col gap-2 border-t border-pos-line pt-4 text-[13px]">
          <div class="flex items-start gap-2.5 text-pos-ink-2">
            <dt class="sr-only">{{ t('admin.shops.addressLabel') }}</dt>
            <MapPin class="mt-0.5 h-4 w-4 shrink-0 text-pos-faint" aria-hidden="true" />
            <dd>{{ shop.address }}<span class="block text-pos-muted">{{ shop.serviceCity }}</span></dd>
          </div>
          <div class="flex items-center gap-2.5 text-pos-ink-2">
            <dt class="sr-only">{{ t('admin.shops.deliveryFeeLabel') }}</dt>
            <Truck class="h-4 w-4 shrink-0 text-pos-faint" aria-hidden="true" />
            <dd class="pos-num">{{ t('admin.shops.deliveryFrom', { fee: formatMoney(shop.deliveryFee) }) }}</dd>
          </div>
        </dl>
      </article>
    </div>

    <div v-else class="pos-surface"><PosEmptyState :icon="Store" :title="t('admin.shops.empty')" /></div>

    <PosModal v-if="showForm" :title="t('admin.shops.addTitle')" @close="showForm = false">
      <form id="shop-create-form" class="grid gap-4 sm:grid-cols-2" @submit.prevent="createShop">
        <label class="pos-field">
          <span class="pos-label">{{ t('admin.shops.nameLabel') }}</span>
          <input v-model="form.name" required class="pos-input" data-autofocus :placeholder="t('admin.shops.namePlaceholder')" />
        </label>
        <label class="pos-field">
          <span class="pos-label">{{ t('admin.shops.slugLabel') }}</span>
          <input v-model="form.slug" class="pos-input" dir="ltr" :placeholder="t('admin.shops.slugPlaceholder')" />
        </label>
        <label class="pos-field sm:col-span-2">
          <span class="pos-label">{{ t('admin.shops.addressLabel') }}</span>
          <input v-model="form.address" required class="pos-input" :placeholder="t('admin.shops.addressPlaceholder')" />
        </label>
        <label class="pos-field">
          <span class="pos-label">{{ t('admin.shops.cityLabel') }}</span>
          <input v-model="form.serviceCity" required class="pos-input" :placeholder="t('admin.shops.serviceCityPlaceholder')" />
        </label>
        <label class="pos-field">
          <span class="pos-label">{{ t('admin.shops.deliveryFeeLabel') }}</span>
          <span class="relative">
            <input v-model.number="form.deliveryFee" type="number" inputmode="decimal" min="0" required class="pos-input pe-12 pos-num" />
            <span class="pointer-events-none absolute end-3.5 top-1/2 -translate-y-1/2 text-[12px] text-pos-muted">{{ t('common.currency') }}</span>
          </span>
        </label>
        <p v-if="error" class="pos-notice bg-pos-err-bg text-pos-err sm:col-span-2" role="alert"><AlertCircle class="mt-px h-4 w-4 shrink-0" />{{ error }}</p>
      </form>
      <template #footer>
        <button type="button" class="pos-btn-ghost" @click="showForm = false">{{ t('common.cancel') }}</button>
        <button type="submit" form="shop-create-form" class="pos-btn-primary" :disabled="saving">{{ saving ? t('common.saving') : t('common.create') }}</button>
      </template>
    </PosModal>
  </div>
</template>

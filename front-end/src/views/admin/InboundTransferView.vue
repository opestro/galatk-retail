<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { api } from '@/services/api'
import { useAuthStore } from '@/stores/auth'
import type { Product } from '@/types/api'
import PageHeader from '@/components/ui/PageHeader.vue'
import { AlertCircle, Plus, Trash2, ArrowDownToLine } from 'lucide-vue-next'
import { useToast } from '@/composables/useToast'
import { formatCount } from '@/utils/formatMoney'

const { t } = useI18n()
const auth = useAuthStore()
const products = ref<Product[]>([])
const loadingProducts = ref(true)
const lines = ref<Array<{ productId: string; quantity: number }>>([{ productId: '', quantity: 1 }])
const galatkTransferRef = ref('')
const note = ref('')
const error = ref('')
const submitting = ref(false)
const toast = useToast()

const validLines = computed(() => lines.value.filter((l) => l.productId && l.quantity > 0))
const totalUnits = computed(() => validLines.value.reduce((sum, l) => sum + l.quantity, 0))

function removeLine(index: number) {
  lines.value = lines.value.length > 1 ? lines.value.filter((_, i) => i !== index) : [{ productId: '', quantity: 1 }]
}

async function loadProducts() {
  loadingProducts.value = true
  try {
    const { data } = await api.get<{ data: Product[] }>('/products')
    products.value = data.data
  } finally {
    loadingProducts.value = false
  }
}

function addLine() {
  lines.value.push({ productId: '', quantity: 1 })
}

async function submitTransfer() {
  const shopId = auth.selectedShopId
  if (!shopId || submitting.value || !validLines.value.length) return
  error.value = ''
  submitting.value = true
  try {
    await api.post(`/shops/${shopId}/inbound-transfers`, {
      lines: validLines.value,
      galatkTransferRef: galatkTransferRef.value || undefined,
      note: note.value || undefined,
    })
    toast.success(t('admin.inbound.success'))
    lines.value = [{ productId: '', quantity: 1 }]
    galatkTransferRef.value = ''
    note.value = ''
  } catch {
    error.value = t('admin.inbound.failed')
  } finally {
    submitting.value = false
  }
}

onMounted(loadProducts)
watch(() => auth.selectedShopId, () => { lines.value = [{ productId: '', quantity: 1 }] })
</script>

<template>
  <div class="page-shell">
    <PageHeader :title="t('admin.inbound.title')" :subtitle="t('admin.inbound.subtitle')" />

    <div v-if="loadingProducts" class="pos-skeleton h-96 max-w-3xl rounded-2xl" role="status">
      <span class="sr-only">{{ t('common.loading') }}</span>
    </div>

    <form v-else class="pos-surface flex max-w-3xl flex-col" @submit.prevent="submitTransfer">
      <div class="grid gap-4 p-6 sm:grid-cols-2">
        <label class="pos-field">
          <span class="pos-label">{{ t('admin.inbound.refLabel') }}</span>
          <input v-model="galatkTransferRef" class="pos-input" :placeholder="t('admin.inbound.refPlaceholder')" />
        </label>
        <label class="pos-field sm:row-span-2">
          <span class="pos-label">{{ t('admin.inbound.noteLabel') }}</span>
          <textarea v-model="note" class="pos-input h-full min-h-11 resize-none py-3" :placeholder="t('admin.inbound.notePlaceholder')" />
        </label>
      </div>

      <div class="border-t border-pos-line px-6 py-5">
        <div class="mb-3 flex items-center justify-between">
          <h2 class="section-title">{{ t('admin.inbound.linesTitle') }}</h2>
          <span class="pos-badge-neutral pos-num">{{ t('admin.inbound.units', { n: formatCount(totalUnits) }, totalUnits) }}</span>
        </div>
        <TransitionGroup tag="ul" name="pos-list" class="relative flex flex-col gap-2">
          <li v-for="(line, i) in lines" :key="i" class="grid grid-cols-[minmax(0,1fr)_6rem_auto] items-center gap-2">
            <select v-model="line.productId" class="pos-input" :aria-label="t('admin.inbound.selectProduct')">
              <option value="">{{ t('admin.inbound.selectProduct') }}</option>
              <option v-for="p in products" :key="p.id" :value="p.id">{{ p.name }}</option>
            </select>
            <input v-model.number="line.quantity" type="number" inputmode="numeric" min="1" class="pos-input pos-num" :aria-label="t('admin.orderDetail.qty')" />
            <button
              type="button"
              class="pos-icon-btn hover:bg-pos-err-bg hover:text-pos-err"
              :aria-label="t('admin.inbound.removeLine')"
              :title="t('admin.inbound.removeLine')"
              @click="removeLine(i)"
            >
              <Trash2 class="h-4 w-4" />
            </button>
          </li>
        </TransitionGroup>
        <button type="button" class="pos-btn-ghost pos-btn-sm mt-3" @click="addLine">
          <Plus class="h-4 w-4" />
          {{ t('admin.inbound.addLine') }}
        </button>
      </div>

      <div class="flex flex-col gap-3 border-t border-pos-line bg-pos-sunken/60 px-6 py-4 sm:flex-row sm:items-center sm:justify-between">
        <p v-if="error" class="pos-notice bg-pos-err-bg text-pos-err" role="alert">
          <AlertCircle class="mt-px h-4 w-4 shrink-0" />
          {{ error }}
        </p>
        <p v-else class="text-[12.5px] text-pos-muted">{{ t('admin.inbound.hint') }}</p>
        <button type="submit" class="pos-btn-primary" :disabled="submitting || !validLines.length">
          <ArrowDownToLine class="h-4 w-4" />
          {{ submitting ? t('common.saving') : t('admin.inbound.submit') }}
        </button>
      </div>
    </form>
  </div>
</template>

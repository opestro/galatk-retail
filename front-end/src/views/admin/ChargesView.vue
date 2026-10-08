<script setup lang="ts">
import { ref, onMounted, watch, computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { useAuthStore } from '@/stores/auth'
import { listCharges, createCharge, voidCharge } from '@/services/clientApi'
import type { ShopCharge } from '@/types/api'
import PageHeader from '@/components/ui/PageHeader.vue'
import AdminDateRange from '@/components/admin/AdminDateRange.vue'
import AdminConfirm from '@/components/admin/AdminConfirm.vue'
import AdminStat from '@/components/admin/AdminStat.vue'
import PosModal from '@/components/pos/PosModal.vue'
import PosRowMenu from '@/components/pos/PosRowMenu.vue'
import PosEmptyState from '@/components/pos/PosEmptyState.vue'
import { useToast } from '@/composables/useToast'
import { formatAmount, formatDateTime, formatMoney } from '@/utils/formatMoney'
import { AlertCircle, Ban, Bus, Coins, Plus, Receipt, UtensilsCrossed, Wallet } from 'lucide-vue-next'

const { t } = useI18n()
const auth = useAuthStore()
const charges = ref<ShopCharge[]>([])
const loading = ref(true)
const showForm = ref(false)
const error = ref('')
const saving = ref(false)
const toast = useToast()

const dateRange = ref({ from: '', to: '' })
// The API stores lowercase ids (backend shared/charges/categories.ts); labels use uppercase keys.
const form = ref({
  category: 'team_food',
  amount: 0,
  chargeDate: new Date().toISOString().slice(0, 10),
  note: '',
})

const voidTarget = ref<ShopCharge | null>(null)

const categoryValues = ['team_food', 'petty_cash', 'transport', 'other'] as const

const categories = computed(() =>
  categoryValues.map((value) => ({
    value,
    label: categoryLabel(value),
  })),
)

function categoryLabel(category: string) {
  const key = `admin.charges.category.${category.toUpperCase()}`
  const label = t(key)
  return label !== key ? label : category
}

async function load() {
  const shopId = auth.selectedShopId
  if (!shopId) {
    loading.value = false
    return
  }
  loading.value = !charges.value.length
  try {
    const { data } = await listCharges(
      shopId,
      dateRange.value.from || undefined,
      dateRange.value.to || undefined,
    )
    charges.value = data.data
  } finally {
    loading.value = false
  }
}

const CATEGORY_ICONS: Record<string, typeof Receipt> = {
  team_food: UtensilsCrossed,
  petty_cash: Wallet,
  transport: Bus,
  other: Coins,
}

const activeCharges = computed(() => charges.value.filter((charge) => charge.status === 'ACTIVE'))
const activeTotal = computed(() => activeCharges.value.reduce((sum, charge) => sum + Number(charge.amount), 0))
const byCategory = computed(() =>
  categoryValues.map((value) => ({
    value,
    total: activeCharges.value.filter((charge) => charge.category.toLowerCase() === value).reduce((sum, charge) => sum + Number(charge.amount), 0),
  })),
)

function openForm() {
  form.value = { category: 'team_food', amount: 0, chargeDate: new Date().toISOString().slice(0, 10), note: '' }
  error.value = ''
  showForm.value = true
}

async function handleCreate() {
  const shopId = auth.selectedShopId
  if (!shopId || saving.value) return
  error.value = ''
  saving.value = true
  try {
    await createCharge(shopId, {
      category: form.value.category,
      amount: form.value.amount,
      chargeDate: form.value.chargeDate,
      note: form.value.note || undefined,
    })
    showForm.value = false
    toast.success(t('admin.charges.recorded'))
    await load()
  } catch {
    error.value = t('admin.charges.createFailed')
  } finally {
    saving.value = false
  }
}

async function confirmVoid(reason: string) {
  const shopId = auth.selectedShopId
  if (!shopId || !voidTarget.value || saving.value) return
  saving.value = true
  try {
    await voidCharge(shopId, voidTarget.value.id, reason || undefined)
    voidTarget.value = null
    toast.success(t('admin.charges.voided'))
    await load()
  } catch {
    toast.error(t('admin.charges.voidFailed'))
  } finally {
    saving.value = false
  }
}

onMounted(load)
watch(() => auth.selectedShopId, load)
</script>

<template>
  <div class="page-shell">
    <PageHeader :title="t('admin.charges.title')" :subtitle="t('admin.charges.subtitle')">
      <template #actions>
        <button v-if="auth.isManager" type="button" class="pos-btn-primary" @click="openForm">
          <Plus class="h-4 w-4" />
          {{ t('admin.charges.add') }}
        </button>
      </template>
    </PageHeader>

    <AdminDateRange v-model="dateRange" @change="load" />

    <div v-if="loading" class="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
      <div v-for="i in 5" :key="i" class="pos-skeleton h-[92px] rounded-2xl" />
    </div>
    <div v-else class="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
      <AdminStat :icon="Receipt" :label="t('admin.charges.total')" :value="formatAmount(activeTotal)" :unit="t('common.currency')" />
      <AdminStat
        v-for="cat in byCategory"
        :key="cat.value"
        :icon="CATEGORY_ICONS[cat.value]"
        :label="categoryLabel(cat.value)"
        :value="formatAmount(cat.total)"
        :unit="t('common.currency')"
      />
    </div>

    <div class="pos-surface overflow-hidden">
      <div v-if="loading" class="flex flex-col gap-3 p-5" role="status">
        <span class="sr-only">{{ t('common.loading') }}</span>
        <div v-for="i in 4" :key="i" class="pos-skeleton h-5" />
      </div>
      <div v-else-if="charges.length" class="overflow-x-auto">
        <table class="pos-table min-w-[720px]">
          <thead>
            <tr>
              <th scope="col">{{ t('pos.table.date') }}</th>
              <th scope="col">{{ t('admin.charges.colCategory') }}</th>
              <th scope="col">{{ t('admin.clientProfile.note') }}</th>
              <th scope="col">{{ t('admin.clientProfile.colBy') }}</th>
              <th scope="col" class="pos-cell-num">{{ t('pos.table.amount') }}</th>
              <th scope="col">{{ t('pos.table.status') }}</th>
              <th v-if="auth.isManager" scope="col" class="pos-cell-actions"><span class="sr-only">{{ t('common.actions') }}</span></th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="charge in charges" :key="charge.id">
              <td class="whitespace-nowrap text-pos-ink pos-num">{{ formatDateTime(charge.chargeDate).date }}</td>
              <td class="whitespace-nowrap">
                <span class="inline-flex items-center gap-2 text-pos-ink">
                  <component :is="CATEGORY_ICONS[charge.category.toLowerCase()] ?? Coins" class="h-4 w-4 text-pos-muted" />
                  {{ categoryLabel(charge.category) }}
                </span>
              </td>
              <td class="max-w-64 truncate text-pos-muted">{{ charge.note || t('common.emDash') }}</td>
              <td class="whitespace-nowrap text-pos-ink-2">{{ charge.recordedBy.name }}</td>
              <td class="pos-cell-num font-semibold" :class="charge.status === 'ACTIVE' ? 'text-pos-ink' : 'text-pos-muted line-through'">{{ formatMoney(charge.amount) }}</td>
              <td>
                <span :class="charge.status === 'ACTIVE' ? 'pos-badge-ok' : 'pos-badge-err'">
                  <span class="pos-dot" />{{ charge.status === 'ACTIVE' ? t('admin.charges.statusActive') : t('admin.charges.statusVoided') }}
                </span>
              </td>
              <td v-if="auth.isManager" class="pos-cell-actions">
                <PosRowMenu v-if="charge.status === 'ACTIVE'" :label="t('pos.table.moreActions')">
                  <button type="button" role="menuitem" class="pos-menu-item pos-menu-item-danger" @click="voidTarget = charge">
                    <Ban class="h-4 w-4" />
                    {{ t('admin.charges.void') }}
                  </button>
                </PosRowMenu>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
      <PosEmptyState v-else :icon="Receipt" :title="t('admin.charges.empty')" :body="t('admin.charges.emptyBody')" />
    </div>

    <PosModal v-if="showForm" :title="t('admin.charges.add')" size="sm" @close="showForm = false">
      <form id="charge-form" class="flex flex-col gap-4" @submit.prevent="handleCreate">
        <div class="pos-field">
          <span class="pos-label">{{ t('admin.charges.colCategory') }}</span>
          <div class="grid grid-cols-2 gap-2">
            <button
              v-for="cat in categories"
              :key="cat.value"
              type="button"
              class="flex min-h-11 items-center gap-2 rounded-xl px-3 text-[13.5px] transition-colors"
              :class="form.category === cat.value ? 'bg-pos-espresso text-white' : 'bg-pos-canvas text-pos-ink-2 hover:bg-[#eceef1]'"
              :aria-pressed="form.category === cat.value"
              @click="form.category = cat.value"
            >
              <component :is="CATEGORY_ICONS[cat.value]" class="h-4 w-4" />
              {{ cat.label }}
            </button>
          </div>
        </div>
        <label class="pos-field">
          <span class="pos-label">{{ t('pos.table.amount') }}</span>
          <span class="relative">
            <input
              v-model.number="form.amount"
              type="number"
              inputmode="decimal"
              min="0"
              step="0.01"
              required
              data-autofocus
              class="pos-input h-14 pe-14 text-[22px] font-semibold pos-num"
              @focus="($event.target as HTMLInputElement).select()"
            />
            <span class="pointer-events-none absolute end-4 top-1/2 -translate-y-1/2 text-[13px] text-pos-muted">{{ t('common.currency') }}</span>
          </span>
        </label>
        <label class="pos-field">
          <span class="pos-label">{{ t('pos.table.date') }}</span>
          <input v-model="form.chargeDate" type="date" required class="pos-input pos-num" />
        </label>
        <label class="pos-field">
          <span class="pos-label">{{ t('admin.clientProfile.note') }}</span>
          <textarea v-model="form.note" class="pos-input h-auto min-h-20 resize-none py-3" :placeholder="t('admin.charges.notePlaceholder')" />
        </label>
        <p v-if="error" class="pos-notice bg-pos-err-bg text-pos-err" role="alert"><AlertCircle class="mt-px h-4 w-4 shrink-0" />{{ error }}</p>
      </form>
      <template #footer>
        <button type="button" class="pos-btn-ghost" @click="showForm = false">{{ t('common.cancel') }}</button>
        <button type="submit" form="charge-form" class="pos-btn-primary" :disabled="saving || form.amount <= 0">{{ saving ? t('common.saving') : t('admin.charges.record') }}</button>
      </template>
    </PosModal>

    <AdminConfirm
      v-if="voidTarget"
      :title="t('admin.charges.voidTitle')"
      :body="`${categoryLabel(voidTarget.category)} · ${formatMoney(voidTarget.amount)}`"
      :confirm-label="t('admin.charges.voidTitle')"
      danger
      :busy="saving"
      :note-label="t('pos.void.reasonLabel')"
      :note-placeholder="t('admin.charges.voidReason')"
      @close="voidTarget = null"
      @confirm="confirmVoid"
    />
  </div>
</template>

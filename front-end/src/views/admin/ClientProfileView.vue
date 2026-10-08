<script setup lang="ts">
import { ref, onMounted, computed, watch } from 'vue'
import { useRoute } from 'vue-router'
import { useI18n } from 'vue-i18n'
import { AlertCircle, Ban, Banknote, CreditCard, HandCoins, Mail, Pencil, Phone, Scale, ScrollText, ShieldCheck, Wallet } from 'lucide-vue-next'
import { useAuthStore } from '@/stores/auth'
import {
  getClient,
  updateClient,
  getClientLedger,
  recordClientPayment,
  voidClientPayment,
  createClientAdjustment,
} from '@/services/clientApi'
import type { Client, ClientLedgerEntry } from '@/types/api'
import PageHeader from '@/components/ui/PageHeader.vue'
import AdminStat from '@/components/admin/AdminStat.vue'
import AdminConfirm from '@/components/admin/AdminConfirm.vue'
import PosModal from '@/components/pos/PosModal.vue'
import PosRowMenu from '@/components/pos/PosRowMenu.vue'
import PosEmptyState from '@/components/pos/PosEmptyState.vue'
import { useToast } from '@/composables/useToast'
import { formatAmount, formatDateTime, formatMoney } from '@/utils/formatMoney'

const { t } = useI18n()
const route = useRoute()
const auth = useAuthStore()
const toast = useToast()
const clientId = computed(() => route.params.clientId as string)

const client = ref<Client | null>(null)
const ledger = ref<ClientLedgerEntry[]>([])
const loading = ref(true)
const loadError = ref('')
const dialog = ref<'edit' | 'payment' | 'adjustment' | null>(null)
const voidPaymentId = ref<string | null>(null)
const busy = ref(false)
const error = ref('')

const editForm = ref({ name: '', phone: '', email: '', address: '', notes: '', creditLimit: '' as string | number, isActive: true })
const paymentForm = ref({ amount: 0, paymentMethod: 'CASH' as 'CASH' | 'CARD' })
const adjustmentForm = ref({ amount: 0, note: '' })

const balance = computed(() => Number(client.value?.balance ?? 0))

/** Payment ids already reversed, so their void action is hidden. */
const voidedPayments = computed(
  () => new Set(ledger.value.filter((entry) => entry.type === 'PAYMENT_VOID').map((entry) => entry.paymentId)),
)

const methods = [
  { id: 'CASH' as const, icon: Banknote },
  { id: 'CARD' as const, icon: CreditCard },
]

function fillEditForm() {
  if (!client.value) return
  editForm.value = {
    name: client.value.name,
    phone: client.value.phone,
    email: client.value.email ?? '',
    address: client.value.address ?? '',
    notes: client.value.notes ?? '',
    creditLimit: client.value.creditLimit ?? '',
    isActive: client.value.isActive,
  }
}

async function load() {
  loading.value = !client.value
  try {
    const [clientRes, ledgerRes] = await Promise.all([getClient(clientId.value), getClientLedger(clientId.value)])
    client.value = clientRes.data.data
    ledger.value = ledgerRes.data.data
    loadError.value = ''
    fillEditForm()
  } catch {
    if (!client.value) loadError.value = t('admin.clientProfile.loadFailed')
  } finally {
    loading.value = false
  }
}

function open(kind: 'edit' | 'payment' | 'adjustment') {
  error.value = ''
  if (kind === 'edit') fillEditForm()
  if (kind === 'payment') paymentForm.value = { amount: balance.value > 0 ? balance.value : 0, paymentMethod: 'CASH' }
  if (kind === 'adjustment') adjustmentForm.value = { amount: 0, note: '' }
  dialog.value = kind
}

async function run(action: () => Promise<unknown>, success: string, failure: string) {
  if (busy.value) return
  busy.value = true
  error.value = ''
  try {
    await action()
    dialog.value = null
    toast.success(success)
    await load()
  } catch {
    error.value = failure
  } finally {
    busy.value = false
  }
}

function saveClient() {
  if (!auth.isManager || !client.value) return
  const body: Record<string, unknown> = {
    name: editForm.value.name,
    phone: editForm.value.phone,
    email: editForm.value.email || null,
    address: editForm.value.address || null,
    notes: editForm.value.notes || null,
    isActive: editForm.value.isActive,
    creditLimit: editForm.value.creditLimit === '' ? null : Number(editForm.value.creditLimit),
  }
  void run(() => updateClient(clientId.value, body), t('admin.clientProfile.updated'), t('admin.clientProfile.updateFailed'))
}

function submitPayment() {
  const shopId = auth.selectedShopId
  if (!shopId || !client.value || paymentForm.value.amount <= 0) return
  void run(
    () => recordClientPayment(shopId, clientId.value, { amount: paymentForm.value.amount, paymentMethod: paymentForm.value.paymentMethod }),
    t('admin.clientProfile.paymentRecorded'),
    t('admin.clientProfile.paymentFailed'),
  )
}

function submitAdjustment() {
  if (!auth.isManager || !adjustmentForm.value.amount) return
  void run(
    () => createClientAdjustment(clientId.value, { amount: adjustmentForm.value.amount, note: adjustmentForm.value.note || undefined }),
    t('admin.clientProfile.adjustmentRecorded'),
    t('admin.clientProfile.adjustmentFailed'),
  )
}

async function confirmVoidPayment() {
  const shopId = auth.selectedShopId
  const paymentId = voidPaymentId.value
  if (!shopId || !auth.isManager || !paymentId) return
  await run(() => voidClientPayment(shopId, clientId.value, paymentId), t('admin.clientProfile.paymentVoided'), t('admin.clientProfile.voidFailed'))
  if (!error.value) voidPaymentId.value = null
}

function typeLabel(type: string): string {
  const key = `admin.clientProfile.ledgerType.${type}`
  const label = t(key)
  return label !== key ? label : type
}

const TYPE_TONES: Record<string, string> = {
  SALE_CREDIT: 'pos-badge-warn',
  PAYMENT_VOID: 'pos-badge-err',
  PAYMENT: 'pos-badge-ok',
  SALE_VOID_REVERSAL: 'pos-badge-neutral',
  ADJUSTMENT: 'pos-badge-neutral',
}

function signedAmount(amount: string): string {
  const value = Number(amount)
  return value > 0 ? `+${formatMoney(value)}` : formatMoney(value)
}

onMounted(load)
watch(clientId, () => {
  client.value = null
  void load()
})
</script>

<template>
  <div class="page-shell">
    <div v-if="loading" class="flex flex-col gap-6" role="status">
      <span class="sr-only">{{ t('common.loading') }}</span>
      <div class="pos-skeleton h-8 w-56" />
      <div class="grid gap-4 sm:grid-cols-3">
        <div v-for="i in 3" :key="i" class="pos-skeleton h-[92px] rounded-2xl" />
      </div>
      <div class="pos-skeleton h-64 rounded-2xl" />
    </div>

    <template v-else-if="client">
      <PageHeader :title="client.name" back="/admin/clients" :back-label="t('admin.clientProfile.back')">
        <template #subtitle>
          <span class="inline-flex flex-wrap items-center gap-x-3 gap-y-1">
            <span class="inline-flex items-center gap-1.5"><Phone class="h-3.5 w-3.5" /><bdi>{{ client.phone }}</bdi></span>
            <span v-if="client.email" class="inline-flex items-center gap-1.5"><Mail class="h-3.5 w-3.5" />{{ client.email }}</span>
            <span v-if="!client.isActive" class="pos-badge-neutral h-5 px-2 text-[11px]">{{ t('admin.clients.inactive') }}</span>
          </span>
        </template>
        <template #actions>
          <button v-if="auth.isManager" type="button" class="pos-btn-soft" @click="open('edit')">
            <Pencil class="h-4 w-4" />
            {{ t('admin.clientProfile.edit') }}
          </button>
          <PosRowMenu v-if="auth.isManager" :label="t('pos.table.moreActions')">
            <button type="button" role="menuitem" class="pos-menu-item" @click="open('adjustment')">
              <Scale class="h-4 w-4 text-pos-muted" />
              {{ t('admin.clientProfile.adjustment') }}
            </button>
          </PosRowMenu>
          <button type="button" class="pos-btn-primary" @click="open('payment')">
            <Wallet class="h-4 w-4" />
            {{ t('admin.clientProfile.recordPayment') }}
          </button>
        </template>
      </PageHeader>

      <div class="grid gap-4 sm:grid-cols-3">
        <AdminStat
          :icon="HandCoins"
          :tone="balance > 0 ? 'warn' : 'ok'"
          :label="t('admin.clientProfile.balance')"
          :value="formatAmount(client.balance)"
          :unit="t('common.currency')"
          :hint="balance > 0 ? t('admin.clientProfile.owes') : t('admin.clientProfile.settled')"
        />
        <AdminStat
          :icon="ShieldCheck"
          :label="t('admin.clientProfile.creditLimit')"
          :value="client.creditLimit ? formatAmount(client.creditLimit) : t('admin.clientProfile.unlimited')"
          :unit="client.creditLimit ? t('common.currency') : ''"
        />
        <AdminStat
          :icon="ScrollText"
          :label="t('admin.clientProfile.entries')"
          :value="String(ledger.length)"
          :hint="client.notes ?? ''"
        />
      </div>

      <section class="flex flex-col gap-3">
        <h2 class="pos-section-label">{{ t('admin.clientProfile.ledger') }}</h2>
        <div class="pos-surface overflow-hidden">
          <div v-if="ledger.length" class="overflow-x-auto">
            <table class="pos-table min-w-[680px]">
              <thead>
                <tr>
                  <th scope="col">{{ t('pos.table.date') }}</th>
                  <th scope="col">{{ t('admin.clientProfile.colType') }}</th>
                  <th scope="col">{{ t('admin.clientProfile.note') }}</th>
                  <th scope="col">{{ t('admin.clientProfile.colBy') }}</th>
                  <th scope="col" class="pos-cell-num">{{ t('pos.table.amount') }}</th>
                  <th v-if="auth.isManager" scope="col" class="pos-cell-actions"><span class="sr-only">{{ t('common.actions') }}</span></th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="entry in ledger" :key="entry.id">
                  <td class="whitespace-nowrap">
                    <span class="block text-pos-ink pos-num">{{ formatDateTime(entry.createdAt).date }}</span>
                    <span class="block text-[12px] text-pos-muted pos-num">{{ formatDateTime(entry.createdAt).time }}</span>
                  </td>
                  <td><span :class="TYPE_TONES[entry.type] ?? 'pos-badge-neutral'">{{ typeLabel(entry.type) }}</span></td>
                  <td class="max-w-56 truncate text-pos-muted">{{ entry.note || t('common.emDash') }}</td>
                  <td class="whitespace-nowrap text-pos-ink-2">{{ entry.recordedBy?.name ?? t('common.emDash') }}</td>
                  <td class="pos-cell-num font-semibold" :class="Number(entry.amount) < 0 ? 'text-pos-ok' : 'text-pos-ink'">{{ signedAmount(entry.amount) }}</td>
                  <td v-if="auth.isManager" class="pos-cell-actions">
                    <PosRowMenu v-if="entry.type === 'PAYMENT' && entry.paymentId && !voidedPayments.has(entry.paymentId)" :label="t('pos.table.moreActions')">
                      <button type="button" role="menuitem" class="pos-menu-item pos-menu-item-danger" @click="voidPaymentId = entry.paymentId">
                        <Ban class="h-4 w-4" />
                        {{ t('admin.clientProfile.voidPayment') }}
                      </button>
                    </PosRowMenu>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
          <PosEmptyState v-else :icon="ScrollText" :title="t('admin.clientProfile.ledgerEmpty')" compact />
        </div>
      </section>
    </template>

    <template v-else-if="loadError">
      <PageHeader back="/admin/clients" :back-label="t('admin.clientProfile.back')" />
      <p class="pos-notice bg-pos-err-bg text-pos-err" role="alert">
        <AlertCircle class="mt-px h-4 w-4 shrink-0" />
        {{ loadError }}
        <button type="button" class="pos-link ms-auto" @click="load">{{ t('admin.clientProfile.retry') }}</button>
      </p>
    </template>

    <!-- Record payment -->
    <PosModal v-if="dialog === 'payment' && client" :title="t('admin.clientProfile.recordPayment')" :subtitle="client.name" @close="dialog = null">
      <form id="client-payment-form" class="flex flex-col gap-5" @submit.prevent="submitPayment">
        <div class="flex items-center justify-between rounded-xl bg-pos-warn-bg px-4 py-3 text-pos-warn">
          <span class="text-[13px] font-medium">{{ t('pos.paymentModal.outstandingLabel') }}</span>
          <span class="text-[15px] font-semibold pos-num">{{ formatMoney(client.balance) }}</span>
        </div>
        <div class="pos-field">
          <label for="client-pay-amount" class="pos-label">{{ t('pos.paymentModal.amountLabel') }}</label>
          <div class="relative">
            <input
              id="client-pay-amount"
              v-model.number="paymentForm.amount"
              type="number"
              inputmode="decimal"
              min="0"
              step="0.01"
              data-autofocus
              class="pos-input h-16 pe-16 text-[28px] font-semibold tracking-[-0.02em] pos-num"
              @focus="($event.target as HTMLInputElement).select()"
            />
            <span class="pointer-events-none absolute end-4 top-1/2 -translate-y-1/2 text-[15px] font-medium text-pos-muted">{{ t('common.currency') }}</span>
          </div>
          <p class="min-h-5 text-[12.5px] text-pos-muted pos-num">
            <template v-if="paymentForm.amount > 0">{{ formatMoney(paymentForm.amount) }} · {{ t('pos.paymentModal.remainingAfter', { amount: formatMoney(balance - paymentForm.amount) }) }}</template>
          </p>
        </div>
        <div class="pos-field">
          <span class="pos-label">{{ t('pos.paymentModal.paymentMethod') }}</span>
          <div class="pos-segmented" role="group" :aria-label="t('pos.paymentModal.paymentMethod')">
            <button
              v-for="method in methods"
              :key="method.id"
              type="button"
              class="pos-segment min-h-10"
              :aria-pressed="paymentForm.paymentMethod === method.id"
              @click="paymentForm.paymentMethod = method.id"
            >
              <component :is="method.icon" class="h-4 w-4" />
              {{ t(`common.paymentMethod.${method.id}`) }}
            </button>
          </div>
        </div>
        <p v-if="error" class="pos-notice bg-pos-err-bg text-pos-err" role="alert"><AlertCircle class="mt-px h-4 w-4 shrink-0" />{{ error }}</p>
      </form>
      <template #footer>
        <button type="button" class="pos-btn-ghost" @click="dialog = null">{{ t('common.cancel') }}</button>
        <button type="submit" form="client-payment-form" class="pos-btn-primary min-w-40" :disabled="busy || paymentForm.amount <= 0">
          {{ busy ? t('pos.paymentModal.processing') : t('admin.clientProfile.record') }}
        </button>
      </template>
    </PosModal>

    <!-- Edit client -->
    <PosModal v-if="dialog === 'edit'" :title="t('admin.clientProfile.edit')" @close="dialog = null">
      <form id="client-edit-form" class="grid gap-4 sm:grid-cols-2" @submit.prevent="saveClient">
        <label class="pos-field sm:col-span-2">
          <span class="pos-label">{{ t('admin.clients.nameLabel') }}</span>
          <input v-model="editForm.name" required class="pos-input" data-autofocus />
        </label>
        <label class="pos-field">
          <span class="pos-label">{{ t('admin.clients.phoneLabel') }}</span>
          <input v-model="editForm.phone" required type="tel" class="pos-input" />
        </label>
        <label class="pos-field">
          <span class="pos-label">{{ t('admin.clients.emailLabel') }}</span>
          <input v-model="editForm.email" type="email" class="pos-input" />
        </label>
        <label class="pos-field sm:col-span-2">
          <span class="pos-label">{{ t('admin.clients.addressLabel') }}</span>
          <input v-model="editForm.address" class="pos-input" />
        </label>
        <label class="pos-field sm:col-span-2">
          <span class="pos-label">{{ t('admin.clients.creditLimitLabel') }}</span>
          <span class="relative">
            <input v-model="editForm.creditLimit" type="number" inputmode="decimal" min="0" class="pos-input pe-12 pos-num" :placeholder="t('admin.clientProfile.unlimited')" />
            <span class="pointer-events-none absolute end-3.5 top-1/2 -translate-y-1/2 text-[12px] text-pos-muted">{{ t('common.currency') }}</span>
          </span>
        </label>
        <label class="pos-field sm:col-span-2">
          <span class="pos-label">{{ t('admin.clients.notesLabel') }}</span>
          <textarea v-model="editForm.notes" class="pos-input h-auto min-h-20 resize-none py-3" />
        </label>
        <div class="flex items-center justify-between gap-3 sm:col-span-2">
          <span id="client-active-label" class="text-[14px] text-pos-ink">{{ t('common.active') }}</span>
          <button
            type="button"
            role="switch"
            class="pos-switch"
            aria-labelledby="client-active-label"
            :aria-checked="editForm.isActive"
            @click="editForm.isActive = !editForm.isActive"
          />
        </div>
        <p v-if="error" class="pos-notice bg-pos-err-bg text-pos-err sm:col-span-2" role="alert"><AlertCircle class="mt-px h-4 w-4 shrink-0" />{{ error }}</p>
      </form>
      <template #footer>
        <button type="button" class="pos-btn-ghost" @click="dialog = null">{{ t('common.cancel') }}</button>
        <button type="submit" form="client-edit-form" class="pos-btn-primary" :disabled="busy">{{ busy ? t('common.saving') : t('common.save') }}</button>
      </template>
    </PosModal>

    <!-- Balance adjustment -->
    <PosModal v-if="dialog === 'adjustment'" :title="t('admin.clientProfile.adjustment')" :subtitle="t('admin.clientProfile.adjustmentHint')" size="sm" @close="dialog = null">
      <form id="client-adjust-form" class="flex flex-col gap-4" @submit.prevent="submitAdjustment">
        <label class="pos-field">
          <span class="pos-label">{{ t('admin.clientProfile.adjustmentAmount') }}</span>
          <span class="relative">
            <input v-model.number="adjustmentForm.amount" type="number" inputmode="decimal" step="0.01" class="pos-input pe-12 pos-num" data-autofocus />
            <span class="pointer-events-none absolute end-3.5 top-1/2 -translate-y-1/2 text-[12px] text-pos-muted">{{ t('common.currency') }}</span>
          </span>
        </label>
        <label class="pos-field">
          <span class="pos-label">{{ t('admin.clientProfile.note') }}</span>
          <input v-model="adjustmentForm.note" class="pos-input" />
        </label>
        <p v-if="error" class="pos-notice bg-pos-err-bg text-pos-err" role="alert"><AlertCircle class="mt-px h-4 w-4 shrink-0" />{{ error }}</p>
      </form>
      <template #footer>
        <button type="button" class="pos-btn-ghost" @click="dialog = null">{{ t('common.cancel') }}</button>
        <button type="submit" form="client-adjust-form" class="pos-btn-primary" :disabled="busy || !adjustmentForm.amount">{{ t('admin.clientProfile.applyAdjustment') }}</button>
      </template>
    </PosModal>

    <AdminConfirm
      v-if="voidPaymentId"
      :title="t('admin.clientProfile.voidPayment')"
      :body="t('admin.clientProfile.voidPaymentBody')"
      :confirm-label="t('admin.clientProfile.voidPayment')"
      danger
      :busy="busy"
      :error="error"
      @close="voidPaymentId = null; error = ''"
      @confirm="confirmVoidPayment"
    />
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { BellRing, CheckCheck, HandCoins, PhoneCall, Users } from 'lucide-vue-next'
import { useAuthStore } from '@/stores/auth'
import { getCreditDashboard, getCreditReminders, logReminderContact } from '@/services/clientApi'
import type { CreditDashboardEntry, CreditReminderEntry } from '@/types/api'
import PageHeader from '@/components/ui/PageHeader.vue'
import AdminStat from '@/components/admin/AdminStat.vue'
import AdminConfirm from '@/components/admin/AdminConfirm.vue'
import PosEmptyState from '@/components/pos/PosEmptyState.vue'
import { useToast } from '@/composables/useToast'
import { formatAmount, formatCount, formatDateTime, formatMoney } from '@/utils/formatMoney'

const { t } = useI18n()
const auth = useAuthStore()
const toast = useToast()
const dashboard = ref<CreditDashboardEntry[]>([])
const reminders = ref<CreditReminderEntry[]>([])
const loading = ref(true)
const contactTarget = ref<CreditReminderEntry | null>(null)
const saving = ref(false)

const totalOwed = computed(() => dashboard.value.reduce((sum, entry) => sum + Number(entry.balance), 0))

function nameOf(entry: CreditDashboardEntry): string {
  return entry.clientName ?? entry.name ?? entry.phone
}

function ageOf(entry: CreditDashboardEntry): number {
  return entry.oldestDebtDays ?? entry.oldestDebtAgeDays ?? 0
}

function ageTone(days: number): string {
  if (days > 30) return 'pos-badge-err'
  if (days > 14) return 'pos-badge-warn'
  return 'pos-badge-neutral'
}

async function load() {
  const shopId = auth.selectedShopId
  if (!shopId) {
    loading.value = false
    return
  }
  loading.value = !dashboard.value.length && !reminders.value.length
  try {
    const [dashRes, remRes] = await Promise.all([getCreditDashboard(shopId), getCreditReminders(shopId)])
    dashboard.value = dashRes.data.data
    reminders.value = remRes.data.data
  } finally {
    loading.value = false
  }
}

async function logContact(note: string) {
  if (!contactTarget.value || saving.value) return
  saving.value = true
  try {
    await logReminderContact(contactTarget.value.clientId, note || undefined)
    toast.success(t('admin.credit.contactLogged'))
    contactTarget.value = null
    await load()
  } catch {
    toast.error(t('admin.credit.contactFailed'))
  } finally {
    saving.value = false
  }
}

onMounted(load)
watch(() => auth.selectedShopId, load)
</script>

<template>
  <div class="page-shell">
    <PageHeader :title="t('admin.credit.title')" :subtitle="t('admin.credit.subtitle')" />

    <div v-if="loading" class="grid gap-4 sm:grid-cols-3">
      <div v-for="i in 3" :key="i" class="pos-skeleton h-[92px] rounded-2xl" />
    </div>
    <div v-else class="grid gap-4 sm:grid-cols-3">
      <AdminStat :icon="HandCoins" :tone="totalOwed > 0 ? 'warn' : 'neutral'" :label="t('pos.credits.totalOwedLabel')" :value="formatAmount(totalOwed)" :unit="t('common.currency')" />
      <AdminStat :icon="Users" :label="t('admin.credit.outstandingCount')" :value="formatCount(dashboard.length)" />
      <AdminStat :icon="BellRing" :tone="reminders.length ? 'err' : 'ok'" :label="t('admin.credit.dueCount')" :value="formatCount(reminders.length)" />
    </div>

    <!-- Due for a reminder -->
    <section class="flex flex-col gap-3">
      <h2 class="pos-section-label">{{ t('admin.credit.reminderList') }}</h2>
      <div class="pos-surface overflow-hidden">
        <div v-if="loading" class="flex flex-col gap-3 p-5"><div v-for="i in 3" :key="i" class="pos-skeleton h-5" /></div>
        <div v-else-if="reminders.length" class="overflow-x-auto">
          <table class="pos-table min-w-[720px]">
            <thead>
              <tr>
                <th scope="col">{{ t('pos.table.client') }}</th>
                <th scope="col">{{ t('pos.table.oldestDebt') }}</th>
                <th scope="col">{{ t('admin.credit.colLastContact') }}</th>
                <th scope="col" class="pos-cell-num">{{ t('pos.table.balance') }}</th>
                <th scope="col" class="pos-cell-actions"><span class="sr-only">{{ t('common.actions') }}</span></th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="entry in reminders" :key="entry.clientId">
                <td class="whitespace-nowrap">
                  <RouterLink :to="`/admin/clients/${entry.clientId}`" class="block font-medium text-pos-ink hover:underline">{{ nameOf(entry) }}</RouterLink>
                  <a :href="`tel:${entry.phone}`" class="block text-[12px] text-pos-muted hover:underline"><bdi>{{ entry.phone }}</bdi></a>
                </td>
                <td><span :class="ageTone(ageOf(entry))" class="pos-num">{{ t('admin.credit.daysOverdue', { n: formatCount(ageOf(entry)) }) }}</span></td>
                <td class="whitespace-nowrap text-pos-muted pos-num">
                  {{ entry.lastContactedAt ? formatDateTime(entry.lastContactedAt).date : t('admin.credit.never') }}
                </td>
                <td class="pos-cell-num font-semibold text-pos-ink">{{ formatMoney(entry.balance) }}</td>
                <td class="pos-cell-actions">
                  <button type="button" class="pos-btn-soft pos-btn-sm" @click="contactTarget = entry">
                    <PhoneCall class="h-4 w-4" />
                    {{ t('admin.credit.markContacted') }}
                  </button>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
        <PosEmptyState v-else :icon="CheckCheck" :title="t('admin.credit.noneDue')" compact />
      </div>
    </section>

    <!-- All outstanding -->
    <section class="flex flex-col gap-3">
      <h2 class="pos-section-label">{{ t('admin.credit.outstandingSection') }}</h2>
      <div class="pos-surface overflow-hidden">
        <div v-if="loading" class="flex flex-col gap-3 p-5"><div v-for="i in 3" :key="i" class="pos-skeleton h-5" /></div>
        <div v-else-if="dashboard.length" class="overflow-x-auto">
          <table class="pos-table min-w-[560px]">
            <thead>
              <tr>
                <th scope="col">{{ t('pos.table.client') }}</th>
                <th scope="col">{{ t('pos.table.phone') }}</th>
                <th scope="col">{{ t('pos.table.oldestDebt') }}</th>
                <th scope="col" class="pos-cell-num">{{ t('pos.table.balance') }}</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="entry in dashboard" :key="entry.clientId">
                <td class="whitespace-nowrap">
                  <RouterLink :to="`/admin/clients/${entry.clientId}`" class="font-medium text-pos-ink hover:underline">{{ nameOf(entry) }}</RouterLink>
                </td>
                <td class="whitespace-nowrap text-pos-ink-2"><bdi>{{ entry.phone }}</bdi></td>
                <td><span :class="ageTone(ageOf(entry))" class="pos-num">{{ t('admin.credit.days', { n: formatCount(ageOf(entry)) }) }}</span></td>
                <td class="pos-cell-num font-semibold text-pos-ink">{{ formatMoney(entry.balance) }}</td>
              </tr>
            </tbody>
          </table>
        </div>
        <PosEmptyState v-else :icon="HandCoins" :title="t('pos.credits.empty')" :body="t('pos.credits.emptyBody')" compact />
      </div>
    </section>

    <AdminConfirm
      v-if="contactTarget"
      :title="t('admin.credit.markContacted')"
      :body="t('admin.credit.contactBody', { name: nameOf(contactTarget), amount: formatMoney(contactTarget.balance) })"
      :confirm-label="t('admin.credit.logContact')"
      :note-label="t('admin.credit.noteLabel')"
      :note-placeholder="t('admin.credit.contactNotePrompt')"
      :busy="saving"
      @close="contactTarget = null"
      @confirm="logContact"
    />
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, watch } from 'vue'
import { RouterLink } from 'vue-router'
import { useI18n } from 'vue-i18n'
import { useAuthStore } from '@/stores/auth'
import { getCreditDashboard, getCreditReminders, logReminderContact } from '@/services/clientApi'
import type { CreditDashboardEntry, CreditReminderEntry } from '@/types/api'
import PageHeader from '@/components/ui/PageHeader.vue'
import SkeletonList from '@/components/ui/SkeletonList.vue'
import SkeletonStatCards from '@/components/ui/SkeletonStatCards.vue'

const { t } = useI18n()
const auth = useAuthStore()
const dashboard = ref<CreditDashboardEntry[]>([])
const reminders = ref<CreditReminderEntry[]>([])
const loading = ref(true)
const message = ref('')

async function load() {
  const shopId = auth.selectedShopId
  if (!shopId) {
    loading.value = false
    return
  }
  loading.value = true
  try {
    const [dashRes, remRes] = await Promise.all([
      getCreditDashboard(shopId),
      getCreditReminders(shopId),
    ])
    dashboard.value = dashRes.data.data
    reminders.value = remRes.data.data
  } finally {
    loading.value = false
  }
}

async function markContacted(clientId: string) {
  const note = prompt(t('admin.credit.contactNotePrompt')) ?? undefined
  await logReminderContact(clientId, note)
  message.value = t('admin.credit.contactLogged')
  await load()
}

onMounted(load)
watch(() => auth.selectedShopId, load)
</script>

<template>
  <div class="page-shell">
    <PageHeader :title="t('admin.credit.title')" />

    <SkeletonStatCards v-if="loading" :count="2" />

    <div v-else class="grid gap-6 md:grid-cols-2">
      <div class="card">
        <p class="text-sm text-gray-500">{{ t('admin.credit.outstandingCount') }}</p>
        <p class="mt-2 text-2xl font-semibold">{{ dashboard.length }}</p>
      </div>
      <div class="card">
        <p class="text-sm text-gray-500">{{ t('admin.credit.dueCount') }}</p>
        <p class="mt-2 text-2xl font-semibold">{{ reminders.length }}</p>
      </div>
    </div>

    <p v-if="message" class="text-sm text-green-600">{{ message }}</p>

    <div class="flex flex-col gap-4">
      <h3 class="section-title">{{ t('admin.credit.outstandingSection') }}</h3>
      <SkeletonList v-if="loading" />
      <ul v-else class="list-panel">
        <li v-for="entry in dashboard" :key="entry.clientId" class="list-row">
          <div>
            <RouterLink :to="`/admin/clients/${entry.clientId}`" class="font-medium hover:underline">
              {{ entry.clientName }}
            </RouterLink>
            <p class="text-sm text-gray-500">{{ entry.phone }}</p>
          </div>
          <div class="text-end">
            <p class="font-medium">{{ entry.balance }} {{ t('common.currency') }}</p>
            <p class="text-xs text-gray-500">{{ t('admin.credit.days', { n: entry.oldestDebtDays }) }}</p>
          </div>
        </li>
      </ul>
    </div>

    <div class="flex flex-col gap-4">
      <h3 class="section-title">{{ t('admin.credit.reminderList') }}</h3>
      <SkeletonList v-if="loading" />
      <ul v-else class="list-panel">
        <li v-for="entry in reminders" :key="entry.clientId" class="list-row">
          <div>
            <RouterLink :to="`/admin/clients/${entry.clientId}`" class="font-medium hover:underline">
              {{ entry.clientName }}
            </RouterLink>
            <p class="text-sm text-gray-500">{{ entry.phone }} · {{ t('admin.credit.daysOverdue', { n: entry.oldestDebtDays }) }}</p>
            <p v-if="entry.lastContactedAt" class="text-xs text-gray-400">
              {{ t('admin.credit.lastContact', { date: new Date(entry.lastContactedAt).toLocaleDateString() }) }}
            </p>
          </div>
          <div class="flex flex-col items-end gap-2">
            <span class="font-medium">{{ entry.balance }} {{ t('common.currency') }}</span>
            <button class="btn-secondary text-xs" @click="markContacted(entry.clientId)">{{ t('admin.credit.markContacted') }}</button>
          </div>
        </li>
      </ul>
    </div>
  </div>
</template>

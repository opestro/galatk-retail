<script setup lang="ts">
import { ref, onMounted, watch, computed, inject } from 'vue'
import { useAuthStore } from '@/stores/auth'
import { getCreditDashboard, getClient } from '@/services/clientApi'
import type { Client, CreditDashboardEntry } from '@/types/api'
import SkeletonList from '@/components/ui/SkeletonList.vue'

const auth = useAuthStore()
const entries = ref<CreditDashboardEntry[]>([])
const loading = ref(true)
const search = ref('')

const openPaymentForClient = inject<(client: Client) => void>('posOpenPaymentForClient')

const filtered = computed(() => {
  const q = search.value.trim().toLowerCase()
  if (!q) return entries.value
  return entries.value.filter(
    (e) =>
      (e.name ?? e.clientName ?? '').toLowerCase().includes(q) ||
      e.phone.includes(q),
  )
})

const totalOwed = computed(() =>
  entries.value.reduce((sum, e) => sum + Number(e.balance), 0).toFixed(2),
)

async function loadCredits() {
  const shopId = auth.selectedShopId
  if (!shopId) {
    loading.value = false
    return
  }
  loading.value = true
  try {
    const { data } = await getCreditDashboard(shopId)
    entries.value = data.data
  } finally {
    loading.value = false
  }
}

async function collectPayment(entry: CreditDashboardEntry) {
  if (!openPaymentForClient) return
  const { data } = await getClient(entry.clientId)
  openPaymentForClient(data.data)
}

onMounted(loadCredits)
watch(() => auth.selectedShopId, loadCredits)
</script>

<template>
  <div class="page-shell max-w-full">
    <div class="page-header">
      <div>
        <h2 class="page-title">Client credit & debt</h2>
        <p class="text-sm text-gray-500">Search debtors · F4 to record payment from register</p>
      </div>
      <p class="text-lg font-semibold text-gray-900">{{ totalOwed }} DZD total owed</p>
    </div>

    <input v-model="search" placeholder="Search client by name or phone…" class="input max-w-sm" />

    <SkeletonList v-if="loading" :rows="5" />
    <div v-else class="list-panel">
      <div
        v-for="entry in filtered"
        :key="entry.clientId"
        class="list-row flex-col items-start gap-2 sm:flex-row sm:items-center"
      >
        <div class="min-w-0 flex-1">
          <p class="font-medium text-gray-900">{{ entry.name ?? entry.clientName }}</p>
          <p class="text-xs text-gray-500">{{ entry.phone }}</p>
        </div>
        <div class="flex items-center gap-3">
          <div class="text-right">
            <p class="font-semibold text-amber-700">{{ entry.balance }} DZD</p>
            <p class="text-xs text-gray-500">
              Oldest debt: {{ entry.oldestDebtAgeDays ?? entry.oldestDebtDays ?? 0 }} days
            </p>
          </div>
          <button type="button" class="btn-primary shrink-0 px-3 py-1.5 text-xs" @click="collectPayment(entry)">
            Collect payment
          </button>
        </div>
      </div>
      <p v-if="!filtered.length" class="px-5 py-8 text-center text-sm text-gray-500">
        No clients with outstanding balance.
      </p>
    </div>
  </div>
</template>

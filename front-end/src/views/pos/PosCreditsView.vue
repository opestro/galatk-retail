<script setup lang="ts">
import { ref, onMounted, watch, computed } from 'vue'
import { useAuthStore } from '@/stores/auth'
import { getCreditDashboard } from '@/services/clientApi'
import type { CreditDashboardEntry } from '@/types/api'
import SkeletonList from '@/components/ui/SkeletonList.vue'

const auth = useAuthStore()
const entries = ref<CreditDashboardEntry[]>([])
const loading = ref(true)
const search = ref('')

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

onMounted(loadCredits)
watch(() => auth.selectedShopId, loadCredits)
</script>

<template>
  <div class="page-shell max-w-full">
    <div class="page-header">
      <div>
        <h2 class="page-title">Client credit & debt</h2>
        <p class="text-sm text-gray-500">Outstanding balances · use F4 to record a payment</p>
      </div>
      <p class="text-lg font-semibold text-gray-900">{{ totalOwed }} DZD total owed</p>
    </div>

    <input v-model="search" placeholder="Search client…" class="input max-w-sm" />

    <SkeletonList v-if="loading" :rows="5" />
    <div v-else class="list-panel">
      <div
        v-for="entry in filtered"
        :key="entry.clientId"
        class="list-row flex-col items-start gap-1 sm:flex-row sm:items-center"
      >
        <div>
          <p class="font-medium text-gray-900">{{ entry.name ?? entry.clientName }}</p>
          <p class="text-xs text-gray-500">{{ entry.phone }}</p>
        </div>
        <div class="text-right">
          <p class="font-semibold text-amber-700">{{ entry.balance }} DZD</p>
          <p class="text-xs text-gray-500">
            Oldest debt: {{ entry.oldestDebtAgeDays ?? entry.oldestDebtDays ?? 0 }} days
          </p>
        </div>
      </div>
      <p v-if="!filtered.length" class="px-5 py-8 text-center text-sm text-gray-500">
        No clients with outstanding balance.
      </p>
    </div>
  </div>
</template>

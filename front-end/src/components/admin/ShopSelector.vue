<script setup lang="ts">
import { ref, onMounted, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { useAuthStore } from '@/stores/auth'
import { api } from '@/services/api'
import type { Shop } from '@/types/api'

defineProps<{
  /** Dense control for the POS header when an admin is cashiering. */
  compact?: boolean
}>()

const { t } = useI18n()
const auth = useAuthStore()
const shops = ref<Shop[]>([])

async function loadShops() {
  if (!auth.isOwner) return
  const { data } = await api.get<{ data: Shop[] }>('/shops')
  shops.value = data.data
}

onMounted(loadShops)
watch(() => auth.isOwner, loadShops)
</script>

<template>
  <div
    v-if="auth.isOwner"
    :class="compact ? 'flex min-w-0 items-center gap-2' : 'mb-5 flex flex-col gap-1.5'"
  >
    <label
      :class="compact ? 'hidden whitespace-nowrap text-xs font-medium text-gray-500 sm:block' : 'block text-xs font-medium text-gray-500'"
    >
      {{ t('admin.shopSelector.label') }}
    </label>
    <select
      :value="auth.selectedShopId ?? ''"
      :aria-label="t('admin.shopSelector.label')"
      :class="compact ? 'input min-h-11 min-w-[8rem] max-w-[14rem] py-1.5 text-sm' : 'input py-2 text-sm'"
      @change="auth.selectShop(($event.target as HTMLSelectElement).value)"
    >
      <option v-for="shop in shops" :key="shop.id" :value="shop.id">
        {{ shop.name }}
      </option>
    </select>
  </div>
</template>

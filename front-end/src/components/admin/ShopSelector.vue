<script setup lang="ts">
import { ref, onMounted, watch } from 'vue'
import { useAuthStore } from '@/stores/auth'
import { api } from '@/services/api'
import type { Shop } from '@/types/api'

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
  <div v-if="auth.isOwner" class="mb-5 flex flex-col gap-1.5">
    <label class="block text-xs font-medium text-gray-500">Active shop</label>
    <select
      :value="auth.selectedShopId ?? ''"
      class="input py-2 text-sm"
      @change="auth.selectShop(($event.target as HTMLSelectElement).value)"
    >
      <option v-for="shop in shops" :key="shop.id" :value="shop.id">
        {{ shop.name }}
      </option>
    </select>
  </div>
</template>

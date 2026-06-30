<script setup lang="ts">
import { ref, onMounted, watch } from 'vue'
import { api } from '@/services/api'
import { useAuthStore } from '@/stores/auth'
import type { Shop } from '@/types/api'
import PageHeader from '@/components/ui/PageHeader.vue'
import SkeletonForm from '@/components/ui/SkeletonForm.vue'

const auth = useAuthStore()
const shop = ref<Shop | null>(null)
const loading = ref(true)
const form = ref({ serviceCity: '', deliveryFee: 0, address: '', creditReminderDays: 30 })
const message = ref('')

async function loadShop() {
  const shopId = auth.selectedShopId
  if (!shopId) {
    loading.value = false
    return
  }
  loading.value = true
  try {
    const { data } = await api.get<{ data: Shop }>(`/shops/${shopId}`)
    shop.value = data.data
    form.value = {
      serviceCity: data.data.serviceCity,
      deliveryFee: Number(data.data.deliveryFee),
      address: data.data.address,
      creditReminderDays: data.data.creditReminderDays ?? 30,
    }
  } finally {
    loading.value = false
  }
}

async function save() {
  const shopId = auth.selectedShopId
  if (!shopId) return
  await api.patch(`/shops/${shopId}`, form.value)
  message.value = 'Settings saved'
  await loadShop()
}

onMounted(loadShop)
watch(() => auth.selectedShopId, loadShop)
</script>

<template>
  <div class="page-shell">
    <PageHeader title="Shop settings" />

    <SkeletonForm v-if="loading" :fields="4" />

    <form v-else-if="shop" class="card flex max-w-md flex-col gap-4" @submit.prevent="save">
      <div>
        <label class="mb-1 block text-sm font-medium text-gray-700">Shop</label>
        <p class="text-gray-900">{{ shop.name }}</p>
      </div>
      <div>
        <label class="mb-1 block text-sm font-medium text-gray-700">Address</label>
        <input v-model="form.address" class="input" />
      </div>
      <div>
        <label class="mb-1 block text-sm font-medium text-gray-700">Service city (delivery)</label>
        <input v-model="form.serviceCity" class="input" />
      </div>
      <div>
        <label class="mb-1 block text-sm font-medium text-gray-700">Delivery fee (DZD)</label>
        <input v-model.number="form.deliveryFee" type="number" class="input" />
      </div>
      <div>
        <label class="mb-1 block text-sm font-medium text-gray-700">Credit reminder days</label>
        <input v-model.number="form.creditReminderDays" type="number" min="1" class="input" />
        <p class="mt-1 text-xs text-gray-500">Days overdue before client appears on reminder list</p>
      </div>
      <p v-if="message" class="text-sm text-green-600">{{ message }}</p>
      <button type="submit" class="btn-primary">Save</button>
    </form>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { api } from '@/services/api'
import type { Shop } from '@/types/api'
import PageHeader from '@/components/ui/PageHeader.vue'
import SkeletonList from '@/components/ui/SkeletonList.vue'

const shops = ref<Shop[]>([])
const loading = ref(true)
const form = ref({ name: '', slug: '', address: '', serviceCity: '', deliveryFee: 0 })
const showForm = ref(false)

async function loadShops() {
  loading.value = true
  try {
    const { data } = await api.get<{ data: Shop[] }>('/shops')
    shops.value = data.data
  } finally {
    loading.value = false
  }
}

async function createShop() {
  await api.post('/shops', { ...form.value, deliveryFee: Number(form.value.deliveryFee) })
  form.value = { name: '', slug: '', address: '', serviceCity: '', deliveryFee: 0 }
  showForm.value = false
  await loadShops()
}

onMounted(loadShops)
</script>

<template>
  <div class="page-shell">
    <PageHeader title="Shops">
      <template #actions>
        <button class="btn-primary" @click="showForm = !showForm">Add shop</button>
      </template>
    </PageHeader>

    <form v-if="showForm" class="card flex flex-col gap-4" @submit.prevent="createShop">
      <input v-model="form.name" placeholder="Name" required class="input" />
      <input v-model="form.slug" placeholder="Slug (optional)" class="input" />
      <input v-model="form.address" placeholder="Address" required class="input" />
      <input v-model="form.serviceCity" placeholder="Service city" required class="input" />
      <input v-model.number="form.deliveryFee" type="number" placeholder="Delivery fee" required class="input" />
      <button type="submit" class="btn-primary">Create</button>
    </form>

    <SkeletonList v-if="loading" />
    <ul v-else class="list-panel">
      <li v-for="shop in shops" :key="shop.id" class="list-row flex-col items-start gap-1 sm:flex-row sm:items-center">
        <div>
          <p class="font-medium text-gray-900">{{ shop.name }}</p>
          <p class="text-sm text-gray-500">{{ shop.slug }} · {{ shop.serviceCity }}</p>
        </div>
      </li>
    </ul>
  </div>
</template>

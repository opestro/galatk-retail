<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { api } from '@/services/api'
import type { Product } from '@/types/api'
import PageHeader from '@/components/ui/PageHeader.vue'
import SkeletonList from '@/components/ui/SkeletonList.vue'

const products = ref<Product[]>([])
const loading = ref(true)
const search = ref('')
const form = ref({ name: '', sellPrice: 0, description: '', availableOnline: true })
const showForm = ref(false)

async function loadProducts() {
  loading.value = true
  try {
    const { data } = await api.get<{ data: Product[] }>('/products', { params: { q: search.value || undefined } })
    products.value = data.data
  } finally {
    loading.value = false
  }
}

async function createProduct() {
  await api.post('/products', { ...form.value, sellPrice: Number(form.value.sellPrice) })
  form.value = { name: '', sellPrice: 0, description: '', availableOnline: true }
  showForm.value = false
  await loadProducts()
}

onMounted(loadProducts)
</script>

<template>
  <div class="page-shell">
    <PageHeader title="Products">
      <template #actions>
        <button class="btn-primary" @click="showForm = !showForm">Add product</button>
      </template>
    </PageHeader>

    <div class="flex gap-3">
      <input
        v-model="search"
        placeholder="Search products…"
        class="input flex-1"
        @keyup.enter="loadProducts"
      />
      <button class="btn-secondary shrink-0" @click="loadProducts">Search</button>
    </div>

    <form v-if="showForm" class="card flex flex-col gap-4" @submit.prevent="createProduct">
      <input v-model="form.name" placeholder="Name" required class="input" />
      <input v-model.number="form.sellPrice" type="number" placeholder="Sell price" required class="input" />
      <textarea v-model="form.description" placeholder="Description" class="input min-h-24" />
      <label class="flex items-center gap-2 text-sm text-gray-700">
        <input v-model="form.availableOnline" type="checkbox" />
        Available online
      </label>
      <button type="submit" class="btn-primary">Create</button>
    </form>

    <SkeletonList v-if="loading" />
    <ul v-else class="list-panel">
      <li v-for="product in products" :key="product.id" class="list-row">
        <div>
          <p class="font-medium text-gray-900">{{ product.name }}</p>
          <p class="mt-0.5 text-sm text-gray-500">{{ product.description }}</p>
        </div>
        <span class="font-medium text-gray-900">{{ product.sellPrice }} DZD</span>
      </li>
    </ul>
  </div>
</template>

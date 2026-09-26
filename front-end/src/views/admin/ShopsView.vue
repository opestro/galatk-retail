<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useI18n } from 'vue-i18n'
import { api } from '@/services/api'
import type { Shop } from '@/types/api'
import PageHeader from '@/components/ui/PageHeader.vue'
import SkeletonList from '@/components/ui/SkeletonList.vue'

const { t } = useI18n()
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
    <PageHeader :title="t('admin.shops.title')">
      <template #actions>
        <button class="btn-primary" @click="showForm = !showForm">{{ t('admin.shops.add') }}</button>
      </template>
    </PageHeader>

    <form v-if="showForm" class="card flex flex-col gap-4" @submit.prevent="createShop">
      <input v-model="form.name" :placeholder="t('admin.shops.namePlaceholder')" required class="input" />
      <input v-model="form.slug" :placeholder="t('admin.shops.slugPlaceholder')" class="input" />
      <input v-model="form.address" :placeholder="t('admin.shops.addressPlaceholder')" required class="input" />
      <input v-model="form.serviceCity" :placeholder="t('admin.shops.serviceCityPlaceholder')" required class="input" />
      <input v-model.number="form.deliveryFee" type="number" :placeholder="t('admin.shops.deliveryFeePlaceholder')" required class="input" />
      <button type="submit" class="btn-primary">{{ t('common.create') }}</button>
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

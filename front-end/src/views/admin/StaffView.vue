<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { api } from '@/services/api'
import type { Shop } from '@/types/api'
import PageHeader from '@/components/ui/PageHeader.vue'
import SkeletonList from '@/components/ui/SkeletonList.vue'

interface StaffMember {
  id: string
  email: string
  name: string
  role: string
  isActive: boolean
  shopAssignments: Array<{ shop: { id: string; name: string } }>
}

const staff = ref<StaffMember[]>([])
const shops = ref<Shop[]>([])
const loading = ref(true)
const form = ref({ email: '', password: '', name: '', role: 'CASHIER', shopIds: [] as string[] })
const showForm = ref(false)

async function load() {
  loading.value = true
  try {
    const [staffRes, shopsRes] = await Promise.all([
      api.get<{ data: StaffMember[] }>('/staff'),
      api.get<{ data: Shop[] }>('/shops'),
    ])
    staff.value = staffRes.data.data
    shops.value = shopsRes.data.data
  } finally {
    loading.value = false
  }
}

async function createStaff() {
  await api.post('/staff', form.value)
  form.value = { email: '', password: '', name: '', role: 'CASHIER', shopIds: [] }
  showForm.value = false
  await load()
}

onMounted(load)
</script>

<template>
  <div class="page-shell">
    <PageHeader title="Staff">
      <template #actions>
        <button class="btn-primary" @click="showForm = !showForm">Add staff</button>
      </template>
    </PageHeader>

    <form v-if="showForm" class="card flex flex-col gap-4" @submit.prevent="createStaff">
      <input v-model="form.name" placeholder="Name" required class="input" />
      <input v-model="form.email" type="email" placeholder="Email" required class="input" />
      <input v-model="form.password" type="password" placeholder="Password" required class="input" />
      <select v-model="form.role" class="input">
        <option value="CASHIER">Cashier</option>
        <option value="MANAGER">Manager</option>
        <option value="OWNER">Owner</option>
      </select>
      <div class="flex flex-col gap-2">
        <label v-for="shop in shops" :key="shop.id" class="flex items-center gap-2 text-sm text-gray-700">
          <input v-model="form.shopIds" type="checkbox" :value="shop.id" />
          {{ shop.name }}
        </label>
      </div>
      <button type="submit" class="btn-primary">Create</button>
    </form>

    <SkeletonList v-if="loading" />
    <ul v-else class="list-panel">
      <li v-for="member in staff" :key="member.id" class="list-row flex-col items-start gap-1 sm:flex-row sm:items-center">
        <div>
          <p class="font-medium text-gray-900">{{ member.name }} · {{ member.role }}</p>
          <p class="text-sm text-gray-500">{{ member.email }}</p>
        </div>
      </li>
    </ul>
  </div>
</template>

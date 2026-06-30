<script setup lang="ts">
import { ref, onMounted, watch } from 'vue'
import { api } from '@/services/api'
import { useAuthStore } from '@/stores/auth'
import type { Product } from '@/types/api'
import PageHeader from '@/components/ui/PageHeader.vue'
import SkeletonForm from '@/components/ui/SkeletonForm.vue'

const auth = useAuthStore()
const products = ref<Product[]>([])
const loadingProducts = ref(true)
const lines = ref<Array<{ productId: string; quantity: number }>>([{ productId: '', quantity: 1 }])
const galatkTransferRef = ref('')
const note = ref('')
const message = ref('')
const error = ref('')

async function loadProducts() {
  loadingProducts.value = true
  try {
    const { data } = await api.get<{ data: Product[] }>('/products')
    products.value = data.data
  } finally {
    loadingProducts.value = false
  }
}

function addLine() {
  lines.value.push({ productId: '', quantity: 1 })
}

async function submitTransfer() {
  const shopId = auth.selectedShopId
  if (!shopId) return
  error.value = ''
  message.value = ''
  try {
    await api.post(`/shops/${shopId}/inbound-transfers`, {
      lines: lines.value.filter((l) => l.productId && l.quantity > 0),
      galatkTransferRef: galatkTransferRef.value || undefined,
      note: note.value || undefined,
    })
    message.value = 'Transfer recorded successfully'
    lines.value = [{ productId: '', quantity: 1 }]
    galatkTransferRef.value = ''
    note.value = ''
  } catch {
    error.value = 'Transfer failed'
  }
}

onMounted(loadProducts)
watch(() => auth.selectedShopId, () => { lines.value = [{ productId: '', quantity: 1 }] })
</script>

<template>
  <div class="page-shell">
    <PageHeader title="Inbound transfer" />

    <SkeletonForm v-if="loadingProducts" :fields="5" />

    <form v-else class="card flex max-w-lg flex-col gap-4" @submit.prevent="submitTransfer">
      <input
        v-model="galatkTransferRef"
        placeholder="Galatk transfer ref (optional)"
        class="input"
      />
      <textarea v-model="note" placeholder="Note (optional)" class="input min-h-20" />

      <div v-for="(line, i) in lines" :key="i" class="flex gap-3">
        <select v-model="line.productId" required class="input flex-1">
          <option value="">Select product</option>
          <option v-for="p in products" :key="p.id" :value="p.id">{{ p.name }}</option>
        </select>
        <input v-model.number="line.quantity" type="number" min="1" class="input w-24 shrink-0" />
      </div>

      <button type="button" class="text-sm text-gray-600 underline" @click="addLine">+ Add line</button>

      <p v-if="message" class="text-sm text-green-600">{{ message }}</p>
      <p v-if="error" class="text-sm text-red-600">{{ error }}</p>

      <button type="submit" class="btn-primary">Record transfer</button>
    </form>
  </div>
</template>

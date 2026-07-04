<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import type { Product } from '@/types/api'
import {
  createProduct,
  formatMarginPercent,
  listProducts,
  updateProduct,
} from '@/services/products'
import PageHeader from '@/components/ui/PageHeader.vue'
import SkeletonTable from '@/components/ui/SkeletonTable.vue'

const products = ref<Product[]>([])
const loading = ref(true)
const search = ref('')
const rowState = ref<Record<string, 'idle' | 'saving' | 'error'>>({})
const rowError = ref<Record<string, string>>({})
const costDraft = ref<Record<string, string>>({})
const priceDraft = ref<Record<string, string>>({})

const newProduct = ref({ name: '', unitCost: 0, sellPrice: 0, availableOnline: true })
const creating = ref(false)

const filteredProducts = computed(() => {
  const q = search.value.trim().toLowerCase()
  if (!q) return products.value
  return products.value.filter((p) => p.name.toLowerCase().includes(q))
})

function syncDrafts(list: Product[]) {
  for (const product of list) {
    costDraft.value[product.id] = product.unitCost
    priceDraft.value[product.id] = product.sellPrice
  }
}

async function loadProducts() {
  loading.value = true
  try {
    products.value = await listProducts(search.value.trim() || undefined)
    syncDrafts(products.value)
  } finally {
    loading.value = false
  }
}

function setRowState(productId: string, state: 'idle' | 'saving' | 'error', message = '') {
  rowState.value[productId] = state
  if (message) {
    rowError.value[productId] = message
  } else {
    delete rowError.value[productId]
  }
}

async function patchProduct(
  product: Product,
  patch: Parameters<typeof updateProduct>[1],
  rollback?: () => void,
) {
  setRowState(product.id, 'saving')
  try {
    const updated = await updateProduct(product.id, patch)
    const index = products.value.findIndex((p) => p.id === product.id)
    if (index >= 0) {
      products.value[index] = updated
      costDraft.value[updated.id] = updated.unitCost
      priceDraft.value[updated.id] = updated.sellPrice
    }
    setRowState(product.id, 'idle')
  } catch {
    rollback?.()
    setRowState(product.id, 'error', 'Save failed')
  }
}

function parseAmount(raw: string | undefined): number | null {
  const parsed = Number(raw?.trim())
  if (!raw?.trim() || !Number.isFinite(parsed) || parsed < 0) return null
  return parsed
}

async function saveCost(product: Product) {
  const parsed = parseAmount(costDraft.value[product.id])
  if (parsed === null) {
    costDraft.value[product.id] = product.unitCost
    setRowState(product.id, 'error', 'Invalid cost')
    return
  }
  if (parsed === Number(product.unitCost)) {
    setRowState(product.id, 'idle')
    return
  }
  await patchProduct(product, { unitCost: parsed }, () => {
    costDraft.value[product.id] = product.unitCost
  })
}

async function savePrice(product: Product) {
  const parsed = parseAmount(priceDraft.value[product.id])
  if (parsed === null) {
    priceDraft.value[product.id] = product.sellPrice
    setRowState(product.id, 'error', 'Invalid price')
    return
  }
  if (parsed === Number(product.sellPrice)) {
    setRowState(product.id, 'idle')
    return
  }
  await patchProduct(product, { sellPrice: parsed }, () => {
    priceDraft.value[product.id] = product.sellPrice
  })
}

async function toggleOnline(product: Product) {
  const next = !product.availableOnline
  const index = products.value.findIndex((p) => p.id === product.id)
  if (index >= 0) {
    products.value[index] = { ...product, availableOnline: next }
  }
  await patchProduct(product, { availableOnline: next }, () => {
    if (index >= 0) products.value[index] = product
  })
}

async function toggleActive(product: Product) {
  const next = !product.isActive
  const index = products.value.findIndex((p) => p.id === product.id)
  if (index >= 0) {
    products.value[index] = { ...product, isActive: next }
  }
  await patchProduct(product, { isActive: next }, () => {
    if (index >= 0) products.value[index] = product
  })
}

async function submitNewProduct() {
  if (!newProduct.value.name.trim()) return
  creating.value = true
  try {
    const created = await createProduct({
      name: newProduct.value.name.trim(),
      unitCost: Number(newProduct.value.unitCost),
      sellPrice: Number(newProduct.value.sellPrice),
      availableOnline: newProduct.value.availableOnline,
    })
    products.value = [...products.value, created].sort((a, b) => a.name.localeCompare(b.name))
    syncDrafts([created])
    newProduct.value = { name: '', unitCost: 0, sellPrice: 0, availableOnline: true }
  } finally {
    creating.value = false
  }
}

onMounted(loadProducts)
</script>

<template>
  <div class="page-shell">
    <PageHeader title="Products">
      <template #actions>
        <span class="text-sm text-gray-500">Unit cost = factory cost. Sell price = what customers pay.</span>
      </template>
    </PageHeader>

    <div class="flex gap-3">
      <input
        v-model="search"
        placeholder="Search products…"
        class="input flex-1"
        @keyup.enter="loadProducts"
      />
      <button type="button" class="btn-secondary shrink-0" @click="loadProducts">Search</button>
    </div>

    <SkeletonTable v-if="loading" :rows="6" />

    <div v-else class="overflow-x-auto rounded-lg border border-gray-200 bg-white">
      <table class="min-w-full text-sm">
        <thead class="border-b border-gray-200 bg-gray-50 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">
          <tr>
            <th class="px-4 py-3">Product</th>
            <th class="px-4 py-3 w-36">Unit cost</th>
            <th class="px-4 py-3 w-36">Sell price</th>
            <th class="px-4 py-3 w-24">Margin</th>
            <th class="px-4 py-3 w-24">Online</th>
            <th class="px-4 py-3 w-24">Active</th>
          </tr>
        </thead>
        <tbody class="divide-y divide-gray-200">
          <tr v-for="product in filteredProducts" :key="product.id">
            <td class="px-4 py-3">
              <div class="flex flex-wrap items-center gap-2">
                <span class="font-medium text-gray-900">{{ product.name }}</span>
                <span
                  v-if="product.galatkProductRef"
                  class="rounded-full border border-gray-300 px-2 py-0.5 text-xs text-gray-600"
                >
                  Factory
                </span>
              </div>
              <p v-if="rowState[product.id] === 'saving'" class="mt-1 text-xs text-gray-500">Saving…</p>
              <p v-else-if="rowState[product.id] === 'error'" class="mt-1 text-xs text-red-600">
                {{ rowError[product.id] ?? 'Save failed' }}
              </p>
            </td>
            <td class="px-4 py-3">
              <input
                v-model="costDraft[product.id]"
                type="number"
                min="0"
                step="0.01"
                class="input w-full"
                @keydown.enter="saveCost(product)"
                @blur="saveCost(product)"
              />
            </td>
            <td class="px-4 py-3">
              <input
                v-model="priceDraft[product.id]"
                type="number"
                min="0"
                step="0.01"
                class="input w-full"
                @keydown.enter="savePrice(product)"
                @blur="savePrice(product)"
              />
            </td>
            <td class="px-4 py-3 tabular-nums text-gray-700">
              {{ formatMarginPercent(product.sellPrice, product.unitCost) }}
            </td>
            <td class="px-4 py-3">
              <label class="inline-flex cursor-pointer items-center gap-2">
                <input
                  type="checkbox"
                  class="size-4 rounded border-gray-300"
                  :checked="product.availableOnline"
                  :disabled="rowState[product.id] === 'saving'"
                  @change="toggleOnline(product)"
                />
              </label>
            </td>
            <td class="px-4 py-3">
              <label class="inline-flex cursor-pointer items-center gap-2">
                <input
                  type="checkbox"
                  class="size-4 rounded border-gray-300"
                  :checked="product.isActive"
                  :disabled="rowState[product.id] === 'saving'"
                  @change="toggleActive(product)"
                />
              </label>
            </td>
          </tr>

          <tr v-if="filteredProducts.length === 0">
            <td colspan="6" class="px-4 py-8 text-center text-gray-500">No products match your search.</td>
          </tr>

          <tr class="bg-gray-50">
            <td class="px-4 py-3">
              <input v-model="newProduct.name" placeholder="New product name" class="input" />
            </td>
            <td class="px-4 py-3">
              <input v-model.number="newProduct.unitCost" type="number" min="0" step="0.01" class="input w-full" />
            </td>
            <td class="px-4 py-3">
              <input v-model.number="newProduct.sellPrice" type="number" min="0" step="0.01" class="input w-full" />
            </td>
            <td class="px-4 py-3">—</td>
            <td class="px-4 py-3">
              <input v-model="newProduct.availableOnline" type="checkbox" class="size-4 rounded border-gray-300" />
            </td>
            <td class="px-4 py-3">
              <button
                type="button"
                class="btn-primary"
                :disabled="creating || !newProduct.name.trim()"
                @click="submitNewProduct"
              >
                {{ creating ? 'Adding…' : 'Add' }}
              </button>
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  </div>
</template>

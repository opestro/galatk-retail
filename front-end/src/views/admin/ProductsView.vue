<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue'
import { useRouter } from 'vue-router'
import { ChevronRight } from 'lucide-vue-next'
import type { ProductFamily } from '@/types/api'
import { listProductFamilies, mediaUrl, familyInStock } from '@/services/products'
import { useAuthStore } from '@/stores/auth'
import PageHeader from '@/components/ui/PageHeader.vue'
import SkeletonList from '@/components/ui/SkeletonList.vue'
import ProductCreateModal from '@/components/admin/products/ProductCreateModal.vue'

const router = useRouter()
const auth = useAuthStore()
const families = ref<ProductFamily[]>([])
const loading = ref(true)
const search = ref('')
const showCreate = ref(false)

const canManage = computed(() => auth.isManager)

async function loadProducts() {
  loading.value = true
  try {
    families.value = await listProductFamilies(search.value.trim() || undefined, auth.selectedShopId ?? undefined)
  } finally {
    loading.value = false
  }
}

function openProduct(family: ProductFamily) {
  router.push({ name: 'admin-product-detail', params: { familyId: family.id } })
}

function onCreated(family: ProductFamily) {
  showCreate.value = false
  router.push({ name: 'admin-product-detail', params: { familyId: family.id } })
}

onMounted(loadProducts)
watch(() => auth.selectedShopId, loadProducts)
</script>

<template>
  <div class="page-shell">
    <PageHeader title="Products">
      <template #actions>
        <button v-if="canManage" type="button" class="btn-primary" @click="showCreate = true">+ Add product</button>
      </template>
    </PageHeader>

    <div class="flex gap-3">
      <input
        v-model="search"
        placeholder="Search products, variants, SKU…"
        class="input flex-1"
        @keyup.enter="loadProducts"
      />
      <button type="button" class="btn-secondary shrink-0" @click="loadProducts">Search</button>
    </div>

    <SkeletonList v-if="loading" :rows="6" />

    <div v-else class="flex flex-col gap-2">
      <p v-if="families.length === 0" class="rounded-lg border border-gray-200 bg-white px-4 py-8 text-center text-gray-500">
        No products match your search.
      </p>

      <button
        v-for="family in families"
        :key="family.id"
        type="button"
        class="flex w-full items-center gap-4 rounded-lg border bg-white px-4 py-3 text-left hover:bg-gray-50"
        :class="familyInStock(family) ? 'border-gray-200' : 'border-gray-200 opacity-70'"
        @click="openProduct(family)"
      >
        <img
          v-if="family.images[0]"
          :src="mediaUrl(family.images[0].url)"
          alt=""
          class="h-12 w-12 shrink-0 rounded-md border border-gray-200 object-cover"
        />
        <div
          v-else
          class="flex h-12 w-12 shrink-0 items-center justify-center rounded-md border border-gray-200 bg-gray-50 text-xs text-gray-400"
        >
          {{ family.name.slice(0, 1) }}
        </div>
        <div class="min-w-0 flex-1">
          <p class="font-semibold text-gray-900">{{ family.name }}</p>
          <p class="truncate text-sm text-gray-500">
            {{ family.variants.length }} variant{{ family.variants.length === 1 ? '' : 's' }}
            <span v-if="family.description"> · {{ family.description }}</span>
          </p>
        </div>
        <span
          v-if="!familyInStock(family)"
          class="shrink-0 rounded-full border border-gray-300 px-2 py-0.5 text-xs text-gray-600"
        >
          Unavailable
        </span>
        <ChevronRight class="h-4 w-4 shrink-0 text-gray-400" />
      </button>
    </div>

    <ProductCreateModal
      v-if="showCreate"
      :shop-id="auth.selectedShopId"
      @close="showCreate = false"
      @created="onCreated"
    />
  </div>
</template>

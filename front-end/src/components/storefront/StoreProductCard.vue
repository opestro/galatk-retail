<script setup lang="ts">
import { computed } from 'vue'
import { Package } from 'lucide-vue-next'
import type { PublicCatalogProductSummary } from '@/services/globalStore'
import { mediaUrl } from '@/services/products'
import { formatFromPrice } from '@/utils/formatMoney'

const props = defineProps<{
  product: PublicCatalogProductSummary
}>()

const primaryImage = computed(() => {
  const images = [...props.product.images].sort((a, b) => a.sortOrder - b.sortOrder)
  return images[0]?.url ? mediaUrl(images[0].url) : null
})
</script>

<template>
  <article
    class="flex h-full flex-col overflow-hidden rounded-xl border border-gray-200 bg-white transition hover:border-gray-300"
  >
    <div class="flex aspect-square items-center justify-center overflow-hidden bg-gray-50">
      <img
        v-if="primaryImage"
        :src="primaryImage"
        :alt="product.name"
        class="h-full w-full object-cover"
      />
      <Package v-else class="h-12 w-12 text-gray-300" />
    </div>
    <div class="flex flex-1 flex-col gap-3 p-4">
      <div class="flex-1">
        <h3 class="text-base font-semibold text-gray-900">{{ product.name }}</h3>
        <p class="mt-1 text-sm font-medium text-gray-900">
          {{ formatFromPrice(product.fromPrice, product.hasPriceRange) }}
        </p>
      </div>
      <span class="btn-secondary w-full text-center">View Product</span>
    </div>
  </article>
</template>

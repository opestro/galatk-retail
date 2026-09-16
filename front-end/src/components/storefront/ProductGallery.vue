<script setup lang="ts">
import { computed } from 'vue'
import { Package } from 'lucide-vue-next'
import type { PublicCatalogImage } from '@/services/globalStore'
import { mediaUrl } from '@/services/products'

const props = defineProps<{
  images: PublicCatalogImage[]
  productName: string
  selectedId?: string | null
}>()

const emit = defineEmits<{
  select: [id: string]
}>()

const ordered = computed(() => [...props.images].sort((a, b) => a.sortOrder - b.sortOrder))

const active = computed(() => {
  if (props.selectedId) {
    return ordered.value.find((image) => image.id === props.selectedId) ?? ordered.value[0]
  }
  return ordered.value[0]
})
</script>

<template>
  <div class="flex flex-col gap-3">
    <div class="flex aspect-square items-center justify-center overflow-hidden rounded-xl border border-gray-200 bg-gray-50">
      <img
        v-if="active"
        :src="mediaUrl(active.url)"
        :alt="productName"
        class="h-full w-full object-cover"
      />
      <Package v-else class="h-16 w-16 text-gray-300" />
    </div>
    <div v-if="ordered.length > 1" class="flex flex-wrap gap-2">
      <button
        v-for="image in ordered"
        :key="image.id"
        type="button"
        class="h-16 w-16 overflow-hidden rounded-md border"
        :class="active?.id === image.id ? 'border-gray-900' : 'border-gray-200'"
        :aria-label="`View image`"
        @click="emit('select', image.id)"
      >
        <img :src="mediaUrl(image.url)" :alt="productName" class="h-full w-full object-cover" />
      </button>
    </div>
  </div>
</template>

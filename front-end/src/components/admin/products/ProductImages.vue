<script setup lang="ts">
import { ref } from 'vue'
import { ImagePlus, Trash2 } from 'lucide-vue-next'
import type { ProductImage } from '@/types/api'
import { mediaUrl } from '@/services/products'

const props = defineProps<{
  images: ProductImage[]
  disabled?: boolean
}>()

const emit = defineEmits<{
  upload: [file: File]
  remove: [imageId: string]
}>()

const inputRef = ref<HTMLInputElement | null>(null)

function onFile(event: Event) {
  const input = event.target as HTMLInputElement
  const file = input.files?.[0]
  if (file) emit('upload', file)
  input.value = ''
}
</script>

<template>
  <div>
    <p class="mb-2 text-sm font-medium text-gray-700">Images</p>
    <div class="flex flex-wrap gap-3">
      <div
        v-for="image in props.images"
        :key="image.id"
        class="relative h-24 w-24 overflow-hidden rounded-md border border-gray-200"
      >
        <img :src="mediaUrl(image.url)" alt="" class="h-full w-full object-cover" />
        <button
          v-if="!props.disabled"
          type="button"
          class="absolute right-1 top-1 rounded bg-white/90 p-1 text-red-600"
          aria-label="Remove image"
          @click="emit('remove', image.id)"
        >
          <Trash2 class="h-3.5 w-3.5" />
        </button>
      </div>
      <button
        v-if="!props.disabled"
        type="button"
        class="flex h-24 w-24 flex-col items-center justify-center gap-1 rounded-md border border-dashed border-gray-300 text-xs text-gray-500 hover:bg-gray-50"
        @click="inputRef?.click()"
      >
        <ImagePlus class="h-5 w-5" />
        Add image
      </button>
      <input
        ref="inputRef"
        type="file"
        accept="image/jpeg,image/png,image/webp,image/gif"
        class="hidden"
        @change="onFile"
      />
    </div>
  </div>
</template>

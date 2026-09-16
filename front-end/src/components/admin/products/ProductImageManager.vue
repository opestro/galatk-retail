<script setup lang="ts">
import { ref } from 'vue'
import { ImagePlus, Star, Trash2 } from 'lucide-vue-next'
import type { ProductImage } from '@/types/api'
import { mediaUrl } from '@/services/products'
import { IMAGE_ACCEPT, IMAGE_MAX_BYTES, IMAGE_MIME } from './variantDraft'

const props = defineProps<{
  images: ProductImage[]
  /** Local object-URL previews used on the create page before the family exists. */
  pendingUrls?: string[]
  disabled?: boolean
  uploading?: boolean
  uploadPercent?: number | null
}>()

const emit = defineEmits<{
  upload: [files: File[]]
  remove: [imageId: string]
  'remove-pending': [index: number]
  'set-primary': [imageId: string]
}>()

const inputRef = ref<HTMLInputElement | null>(null)
const dragging = ref(false)
const localError = ref('')

function validate(files: File[]): File[] {
  const accepted: File[] = []
  for (const file of files) {
    if (!IMAGE_MIME.has(file.type)) {
      localError.value = 'Images must be JPEG, PNG, WebP, or GIF'
      continue
    }
    if (file.size > IMAGE_MAX_BYTES) {
      localError.value = 'Images must be 5MB or smaller'
      continue
    }
    accepted.push(file)
  }
  if (accepted.length) localError.value = ''
  return accepted
}

function takeFiles(list: FileList | File[] | null) {
  if (!list || props.disabled) return
  const valid = validate(Array.from(list))
  if (valid.length) emit('upload', valid)
}

function onFile(event: Event) {
  const input = event.target as HTMLInputElement
  takeFiles(input.files)
  input.value = ''
}

function onDrop(event: DragEvent) {
  dragging.value = false
  event.preventDefault()
  takeFiles(event.dataTransfer?.files ?? null)
}
</script>

<template>
  <div class="flex flex-col gap-3">
    <div
      v-if="props.images.length === 0 && !(props.pendingUrls ?? []).length"
      class="rounded-md border border-dashed border-gray-200 px-4 py-6 text-center text-sm text-gray-500"
    >
      No product images yet.
    </div>

    <div class="grid grid-cols-2 gap-3 sm:grid-cols-3">
      <div
        v-for="(image, index) in props.images"
        :key="image.id"
        class="group relative aspect-square overflow-hidden rounded-md border border-gray-200 bg-gray-50"
      >
        <img :src="mediaUrl(image.url)" alt="" class="h-full w-full object-cover" />
        <span
          v-if="index === 0"
          class="absolute left-1.5 top-1.5 rounded bg-white/95 px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wide text-gray-700"
        >
          Primary
        </span>
        <div v-if="!props.disabled" class="absolute right-1.5 top-1.5 flex flex-col gap-1">
          <button
            type="button"
            class="rounded bg-white/95 p-1.5 text-red-600"
            aria-label="Remove image"
            @click="emit('remove', image.id)"
          >
            <Trash2 class="h-3.5 w-3.5" />
          </button>
          <button
            v-if="index !== 0"
            type="button"
            class="rounded bg-white/95 p-1.5 text-gray-700"
            aria-label="Set as primary image"
            @click="emit('set-primary', image.id)"
          >
            <Star class="h-3.5 w-3.5" />
          </button>
        </div>
      </div>

      <div
        v-for="(url, index) in props.pendingUrls ?? []"
        :key="`pending-${index}`"
        class="group relative aspect-square overflow-hidden rounded-md border border-gray-200 bg-gray-50"
      >
        <img :src="url" alt="" class="h-full w-full object-cover" />
        <span
          v-if="props.images.length === 0 && index === 0"
          class="absolute left-1.5 top-1.5 rounded bg-white/95 px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wide text-gray-700"
        >
          Primary
        </span>
        <button
          v-if="!props.disabled"
          type="button"
          class="absolute right-1.5 top-1.5 rounded bg-white/95 p-1.5 text-red-600"
          aria-label="Remove pending image"
          @click="emit('remove-pending', index)"
        >
          <Trash2 class="h-3.5 w-3.5" />
        </button>
      </div>
    </div>

    <button
      v-if="!props.disabled"
      type="button"
      class="flex min-h-40 w-full flex-col items-center justify-center gap-2 rounded-md border border-dashed border-gray-300 px-4 py-8 text-sm text-gray-500 hover:border-gray-400 hover:bg-gray-50"
      :class="dragging ? 'border-gray-900 bg-gray-50' : ''"
      @click="inputRef?.click()"
      @dragenter.prevent="dragging = true"
      @dragover.prevent="dragging = true"
      @dragleave.prevent="dragging = false"
      @drop="onDrop"
    >
      <ImagePlus class="h-8 w-8 text-gray-400" />
      <span class="font-medium text-gray-700">{{ props.uploading ? 'Uploading…' : 'Add image' }}</span>
      <span class="text-xs text-gray-500">Drop your image here or click to browse</span>
      <span v-if="props.uploading && props.uploadPercent != null" class="text-xs text-gray-600">
        {{ props.uploadPercent }}%
      </span>
    </button>

    <p v-if="localError" class="text-sm text-red-600">{{ localError }}</p>
    <p class="text-xs text-gray-500">The first image is the primary photo shown in the store. Use the star to change it.</p>

    <input
      ref="inputRef"
      type="file"
      :accept="IMAGE_ACCEPT"
      multiple
      class="hidden"
      :disabled="props.disabled"
      @change="onFile"
    />
  </div>
</template>

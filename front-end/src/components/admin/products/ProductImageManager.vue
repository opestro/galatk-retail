<script setup lang="ts">
import { ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { ImagePlus, Star, Trash2 } from 'lucide-vue-next'
import type { ProductImage } from '@/types/api'
import { mediaUrl } from '@/services/products'
import { IMAGE_ACCEPT, IMAGE_MAX_BYTES, IMAGE_MIME } from './variantDraft'

const { t } = useI18n()

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
      localError.value = t('admin.productImages.invalidType')
      continue
    }
    if (file.size > IMAGE_MAX_BYTES) {
      localError.value = t('admin.productImages.tooLarge')
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
    <div v-if="props.images.length || (props.pendingUrls ?? []).length" class="grid grid-cols-3 gap-3">
      <div
        v-for="(image, index) in props.images"
        :key="image.id"
        class="group relative aspect-square overflow-hidden rounded-xl bg-pos-sunken"
      >
        <img :src="mediaUrl(image.url)" alt="" class="h-full w-full object-cover transition-transform duration-500 group-hover:scale-[1.03]" />
        <span v-if="index === 0" class="pos-badge absolute start-2 top-2 h-5 bg-white/95 px-2 text-[11px] text-pos-ink">
          {{ t('admin.productImages.primary') }}
        </span>
        <div
          v-if="!props.disabled"
          class="absolute inset-x-2 bottom-2 flex justify-end gap-1.5 opacity-100 transition-opacity duration-200 sm:opacity-0 sm:group-focus-within:opacity-100 sm:group-hover:opacity-100"
        >
          <button
            v-if="index !== 0"
            type="button"
            class="flex h-8 w-8 items-center justify-center rounded-lg bg-white/95 text-pos-ink-2 hover:bg-white"
            :aria-label="t('admin.productImages.setPrimaryAria')"
            :title="t('admin.productImages.setPrimaryAria')"
            @click="emit('set-primary', image.id)"
          >
            <Star class="h-3.5 w-3.5" />
          </button>
          <button
            type="button"
            class="flex h-8 w-8 items-center justify-center rounded-lg bg-white/95 text-pos-err hover:bg-white"
            :aria-label="t('admin.productImages.removeAria')"
            :title="t('admin.productImages.removeAria')"
            @click="emit('remove', image.id)"
          >
            <Trash2 class="h-3.5 w-3.5" />
          </button>
        </div>
      </div>

      <div
        v-for="(url, index) in props.pendingUrls ?? []"
        :key="`pending-${index}`"
        class="group relative aspect-square overflow-hidden rounded-xl bg-pos-sunken"
      >
        <img :src="url" alt="" class="h-full w-full object-cover" />
        <span
          v-if="props.images.length === 0 && index === 0"
          class="pos-badge absolute start-2 top-2 h-5 bg-white/95 px-2 text-[11px] text-pos-ink"
        >
          {{ t('admin.productImages.primary') }}
        </span>
        <button
          v-if="!props.disabled"
          type="button"
          class="absolute end-2 bottom-2 flex h-8 w-8 items-center justify-center rounded-lg bg-white/95 text-pos-err"
          :aria-label="t('admin.productImages.removePendingAria')"
          @click="emit('remove-pending', index)"
        >
          <Trash2 class="h-3.5 w-3.5" />
        </button>
      </div>
    </div>

    <button
      v-if="!props.disabled || props.uploading"
      type="button"
      class="flex w-full flex-col items-center justify-center gap-2 rounded-2xl border border-dashed px-4 py-8 text-[13px] transition-colors duration-200"
      :class="dragging ? 'border-pos-ink bg-pos-sunken' : 'border-[#d9d9d9] hover:border-pos-faint hover:bg-pos-sunken/60'"
      :disabled="props.disabled"
      @click="inputRef?.click()"
      @dragenter.prevent="dragging = true"
      @dragover.prevent="dragging = true"
      @dragleave.prevent="dragging = false"
      @drop="onDrop"
    >
      <span class="flex h-10 w-10 items-center justify-center rounded-full bg-white text-pos-muted" style="box-shadow: var(--pos-shadow-sm) !important">
        <ImagePlus class="h-[18px] w-[18px]" />
      </span>
      <span class="font-medium text-pos-ink">{{ props.uploading ? t('common.uploading') : t('admin.productImages.add') }}</span>
      <span class="text-[12px] text-pos-muted">{{ t('admin.productImages.dropHint') }}</span>
      <span v-if="props.uploading && props.uploadPercent != null" class="mt-1 h-1 w-32 overflow-hidden rounded-full bg-pos-line">
        <span class="block h-full rounded-full bg-pos-espresso transition-[width] duration-200" :style="{ width: `${props.uploadPercent}%` }" />
      </span>
    </button>
    <p v-else-if="!props.images.length" class="rounded-2xl bg-pos-sunken px-4 py-8 text-center text-[13px] text-pos-muted">
      {{ t('admin.productImages.empty') }}
    </p>

    <p v-if="localError" class="pos-notice bg-pos-err-bg text-pos-err" role="alert">{{ localError }}</p>
    <p class="pos-field-hint">{{ t('admin.productImages.hint') }}</p>

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

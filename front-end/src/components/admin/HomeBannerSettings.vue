<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { ImagePlus, Trash2 } from 'lucide-vue-next'
import Skeleton from '@/components/ui/Skeleton.vue'
import { mediaUrl, apiErrorMessage } from '@/services/products'
import {
  getSiteSettings,
  removeHomeBannerImage,
  updateSiteSettings,
  uploadHomeBannerImage,
} from '@/services/siteSettings'
import type { SiteBannerImage } from '@/types/api'
import { IMAGE_ACCEPT, IMAGE_MIME } from '@/components/admin/products/variantDraft'
import {
  BANNER_MAX_BYTES,
  bannerSizeError,
  readFilePixelSize,
} from '@/utils/bannerImage'

const MAX_IMAGES = 10

const loading = ref(true)
const saving = ref(false)
const uploading = ref(false)
const message = ref('')
const error = ref('')
const imageInput = ref<HTMLInputElement | null>(null)

const form = ref({
  bannerEnabled: true,
  bannerTitle: '',
  bannerSubtitle: '',
  intervalSeconds: 5,
  images: [] as SiteBannerImage[],
})

async function load() {
  loading.value = true
  error.value = ''
  try {
    const settings = await getSiteSettings()
    form.value = {
      bannerEnabled: settings.bannerEnabled,
      bannerTitle: settings.bannerTitle,
      bannerSubtitle: settings.bannerSubtitle,
      intervalSeconds: Math.round((settings.bannerIntervalMs || 5000) / 1000),
      images: settings.images ?? [],
    }
  } catch (e) {
    error.value = apiErrorMessage(e, 'Could not load homepage banner settings')
  } finally {
    loading.value = false
  }
}

async function save() {
  saving.value = true
  message.value = ''
  error.value = ''
  try {
    const settings = await updateSiteSettings({
      bannerEnabled: form.value.bannerEnabled,
      bannerTitle: form.value.bannerTitle,
      bannerSubtitle: form.value.bannerSubtitle,
      bannerIntervalMs: form.value.intervalSeconds * 1000,
    })
    form.value.bannerEnabled = settings.bannerEnabled
    form.value.bannerTitle = settings.bannerTitle
    form.value.bannerSubtitle = settings.bannerSubtitle
    form.value.intervalSeconds = Math.round(settings.bannerIntervalMs / 1000)
    form.value.images = settings.images
    message.value = 'Homepage banner saved'
  } catch (e) {
    error.value = apiErrorMessage(e, 'Could not save homepage banner')
  } finally {
    saving.value = false
  }
}

async function onImageChange(event: Event) {
  const input = event.target as HTMLInputElement
  const files = Array.from(input.files ?? [])
  input.value = ''
  if (!files.length) return

  const remaining = MAX_IMAGES - form.value.images.length
  if (remaining <= 0) {
    error.value = `You can add at most ${MAX_IMAGES} banner images`
    return
  }

  const accepted: File[] = []
  for (const file of files.slice(0, remaining)) {
    if (!IMAGE_MIME.has(file.type)) {
      error.value = 'Images must be JPEG, PNG, WebP, or GIF'
      continue
    }
    if (file.size > BANNER_MAX_BYTES) {
      error.value = 'Banner images must be 8MB or smaller'
      continue
    }
    try {
      const pixels = await readFilePixelSize(file)
      const sizeMessage = bannerSizeError(pixels.width, pixels.height)
      if (sizeMessage) {
        error.value = sizeMessage
        continue
      }
    } catch {
      error.value = 'Could not read image dimensions'
      continue
    }
    accepted.push(file)
  }
  if (!accepted.length) return

  uploading.value = true
  message.value = ''
  error.value = ''
  try {
    let latest = form.value.images
    for (const file of accepted) {
      const settings = await uploadHomeBannerImage(file)
      latest = settings.images
      form.value.images = settings.images
    }
    form.value.images = latest
    message.value =
      accepted.length === 1 ? 'Banner image added' : `${accepted.length} banner images added`
  } catch (e) {
    error.value = apiErrorMessage(e, 'Could not upload banner image')
  } finally {
    uploading.value = false
  }
}

async function removeImage(imageId: string) {
  uploading.value = true
  message.value = ''
  error.value = ''
  try {
    const settings = await removeHomeBannerImage(imageId)
    form.value.images = settings.images
    message.value = 'Banner image removed'
  } catch (e) {
    error.value = apiErrorMessage(e, 'Could not remove banner image')
  } finally {
    uploading.value = false
  }
}

onMounted(load)
</script>

<template>
  <section class="card flex max-w-2xl flex-col gap-4">
    <div>
      <h3 class="text-base font-medium text-gray-900">Homepage banner</h3>
      <p class="mt-1 text-sm text-gray-500">
        Shown at the top of the public store home page. When you add more than one image, the store
        rotates them automatically.
      </p>
    </div>

    <div v-if="loading" class="flex flex-col gap-3" role="status">
      <span class="sr-only">Loading…</span>
      <Skeleton height="h-10" width="w-full" />
      <Skeleton height="h-10" width="w-full" />
      <Skeleton height="h-24" width="w-full" />
      <Skeleton height="h-10" width="w-32" />
    </div>

    <form v-else class="flex flex-col gap-4" @submit.prevent="save">
      <label class="flex items-center gap-2 text-sm text-gray-800">
        <input v-model="form.bannerEnabled" type="checkbox" class="h-4 w-4 rounded border-gray-300" />
        Show banner on the home page
      </label>

      <div>
        <label class="mb-1 block text-sm font-medium text-gray-700">Title</label>
        <input v-model="form.bannerTitle" class="input" maxlength="120" required />
      </div>

      <div>
        <label class="mb-1 block text-sm font-medium text-gray-700">Subtitle</label>
        <textarea v-model="form.bannerSubtitle" class="input min-h-24" maxlength="400" rows="3" />
      </div>

      <div>
        <label class="mb-1 block text-sm font-medium text-gray-700">Slide interval (seconds)</label>
        <input
          v-model.number="form.intervalSeconds"
          type="number"
          min="2"
          max="60"
          class="input max-w-32"
        />
        <p class="mt-1 text-xs text-gray-500">Used when two or more images are uploaded. 2–60 seconds.</p>
      </div>

      <div>
        <label class="mb-2 block text-sm font-medium text-gray-700">Banner images</label>
        <div v-if="form.images.length === 0" class="mb-3 rounded-md border border-dashed border-gray-200 px-4 py-6 text-center text-sm text-gray-500">
          No banner images yet. The home page will show the title on a plain background.
        </div>
        <div v-else class="mb-3 grid grid-cols-2 gap-3 sm:grid-cols-3">
          <div
            v-for="image in form.images"
            :key="image.id"
            class="group relative aspect-[16/9] overflow-hidden rounded-md border border-gray-200 bg-gray-100"
          >
            <img :src="mediaUrl(image.url)" alt="" class="h-full w-full object-cover object-center" />
            <button
              type="button"
              class="absolute right-1.5 top-1.5 rounded bg-white p-1.5 text-red-600"
              aria-label="Remove banner image"
              :disabled="uploading"
              @click="removeImage(image.id)"
            >
              <Trash2 class="h-3.5 w-3.5" />
            </button>
          </div>
        </div>
        <input
          ref="imageInput"
          type="file"
          class="hidden"
          :accept="IMAGE_ACCEPT"
          multiple
          @change="onImageChange"
        />
        <button
          type="button"
          class="btn-secondary"
          :disabled="uploading || form.images.length >= MAX_IMAGES"
          @click="imageInput?.click()"
        >
          <ImagePlus class="mr-2 h-4 w-4" />
          {{ uploading ? 'Uploading…' : 'Add images' }}
        </button>
        <p class="mt-1 text-xs text-gray-500">
          JPEG, PNG, WebP, or GIF. 16:9 only. Recommended 2560 × 1440 px. Minimum 2048 × 1152 px.
          Max 8MB. The store shows a compact center crop of the image.
        </p>
      </div>

      <p v-if="message" class="text-sm text-green-600">{{ message }}</p>
      <p v-if="error" class="text-sm text-red-600">{{ error }}</p>
      <button type="submit" class="btn-primary self-start" :disabled="saving">
        {{ saving ? 'Saving…' : 'Save banner' }}
      </button>
    </form>
  </section>
</template>

<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { useI18n } from 'vue-i18n'
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

const { t } = useI18n()
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
    error.value = apiErrorMessage(e, t('admin.banner.loadError'))
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
    message.value = t('admin.banner.saved')
  } catch (e) {
    error.value = apiErrorMessage(e, t('admin.banner.saveError'))
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
    error.value = t('admin.banner.maxImages', { n: MAX_IMAGES })
    return
  }

  const accepted: File[] = []
  for (const file of files.slice(0, remaining)) {
    if (!IMAGE_MIME.has(file.type)) {
      error.value = t('admin.banner.invalidType')
      continue
    }
    if (file.size > BANNER_MAX_BYTES) {
      error.value = t('admin.banner.tooLarge')
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
      error.value = t('admin.banner.dimensionReadError')
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
      accepted.length === 1
        ? t('admin.banner.imageAdded')
        : t('admin.banner.imagesAdded', { n: accepted.length })
  } catch (e) {
    error.value = apiErrorMessage(e, t('admin.banner.uploadError'))
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
    message.value = t('admin.banner.imageRemoved')
  } catch (e) {
    error.value = apiErrorMessage(e, t('admin.banner.removeError'))
  } finally {
    uploading.value = false
  }
}

onMounted(load)
</script>

<template>
  <section class="card flex max-w-2xl flex-col gap-4">
    <div>
      <h3 class="text-base font-medium text-gray-900">{{ t('admin.banner.title') }}</h3>
      <p class="mt-1 text-sm text-gray-500">
        {{ t('admin.banner.description') }}
      </p>
    </div>

    <div v-if="loading" class="flex flex-col gap-3" role="status">
      <span class="sr-only">{{ t('common.loading') }}</span>
      <Skeleton height="h-10" width="w-full" />
      <Skeleton height="h-10" width="w-full" />
      <Skeleton height="h-24" width="w-full" />
      <Skeleton height="h-10" width="w-32" />
    </div>

    <form v-else class="flex flex-col gap-4" @submit.prevent="save">
      <label class="flex items-center gap-2 text-sm text-gray-800">
        <input v-model="form.bannerEnabled" type="checkbox" class="h-4 w-4 rounded border-gray-300" />
        {{ t('admin.banner.enabled') }}
      </label>

      <div>
        <label class="mb-1 block text-sm font-medium text-gray-700">{{ t('admin.banner.titleField') }}</label>
        <input v-model="form.bannerTitle" class="input" maxlength="120" required />
      </div>

      <div>
        <label class="mb-1 block text-sm font-medium text-gray-700">{{ t('admin.banner.subtitleField') }}</label>
        <textarea v-model="form.bannerSubtitle" class="input min-h-24" maxlength="400" rows="3" />
      </div>

      <div>
        <label class="mb-1 block text-sm font-medium text-gray-700">{{ t('admin.banner.interval') }}</label>
        <input
          v-model.number="form.intervalSeconds"
          type="number"
          min="2"
          max="60"
          class="input max-w-32"
        />
        <p class="mt-1 text-xs text-gray-500">{{ t('admin.banner.intervalHint') }}</p>
      </div>

      <div>
        <label class="mb-2 block text-sm font-medium text-gray-700">{{ t('admin.banner.imagesLabel') }}</label>
        <div v-if="form.images.length === 0" class="mb-3 rounded-md border border-dashed border-gray-200 px-4 py-6 text-center text-sm text-gray-500">
          {{ t('admin.banner.emptyImages') }}
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
              class="absolute end-1.5 top-1.5 rounded bg-white p-1.5 text-red-600"
              :aria-label="t('admin.banner.removeAria')"
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
          <ImagePlus class="me-2 h-4 w-4" />
          {{ uploading ? t('common.uploading') : t('admin.banner.addImages') }}
        </button>
        <p class="mt-1 text-xs text-gray-500">
          {{ t('admin.banner.imageRequirements') }}
        </p>
      </div>

      <p v-if="message" class="text-sm text-green-600">{{ message }}</p>
      <p v-if="error" class="text-sm text-red-600">{{ error }}</p>
      <button type="submit" class="btn-primary self-start" :disabled="saving">
        {{ saving ? t('common.saving') : t('admin.banner.save') }}
      </button>
    </form>
  </section>
</template>

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
  <section class="pos-surface flex max-w-3xl flex-col">
    <div class="px-6 pt-6 pb-2">
      <h2 class="section-title">{{ t('admin.banner.title') }}</h2>
      <p class="mt-1 text-[13px] text-pos-muted">{{ t('admin.banner.description') }}</p>
    </div>

    <div v-if="loading" class="flex flex-col gap-3 p-6" role="status">
      <span class="sr-only">{{ t('common.loading') }}</span>
      <div class="pos-skeleton h-11 rounded-xl" />
      <div class="pos-skeleton h-11 rounded-xl" />
      <div class="pos-skeleton h-24 rounded-xl" />
    </div>

    <form v-else class="flex flex-col" @submit.prevent="save">
      <div class="flex flex-col gap-5 p-6">
        <div class="flex items-center justify-between gap-4 rounded-xl bg-pos-sunken px-4 py-3">
          <span>
            <span id="banner-enabled-label" class="block text-[14px] font-medium text-pos-ink">{{ t('admin.banner.enabled') }}</span>
          </span>
          <button
            type="button"
            role="switch"
            class="pos-switch"
            aria-labelledby="banner-enabled-label"
            :aria-checked="form.bannerEnabled"
            @click="form.bannerEnabled = !form.bannerEnabled"
          />
        </div>

        <label class="pos-field">
          <span class="pos-label">{{ t('admin.banner.titleField') }}</span>
          <input v-model="form.bannerTitle" class="pos-input" maxlength="120" required />
        </label>

        <label class="pos-field">
          <span class="pos-label">{{ t('admin.banner.subtitleField') }}</span>
          <textarea v-model="form.bannerSubtitle" class="pos-input h-auto min-h-24 resize-none py-3" maxlength="400" rows="3" />
        </label>

        <label class="pos-field">
          <span class="pos-label">{{ t('admin.banner.interval') }}</span>
          <input v-model.number="form.intervalSeconds" type="number" inputmode="numeric" min="2" max="60" class="pos-input max-w-32 pos-num" />
          <span class="pos-field-hint">{{ t('admin.banner.intervalHint') }}</span>
        </label>

        <div class="pos-field">
          <span class="pos-label">{{ t('admin.banner.imagesLabel') }}</span>
          <div class="grid grid-cols-2 gap-3 sm:grid-cols-3">
            <div
              v-for="image in form.images"
              :key="image.id"
              class="group relative aspect-[16/9] overflow-hidden rounded-xl bg-pos-sunken"
            >
              <img :src="mediaUrl(image.url)" alt="" class="h-full w-full object-cover object-center" />
              <button
                type="button"
                class="absolute end-2 top-2 flex h-8 w-8 items-center justify-center rounded-lg bg-white/95 text-pos-err opacity-100 transition-opacity sm:opacity-0 sm:group-focus-within:opacity-100 sm:group-hover:opacity-100"
                :aria-label="t('admin.banner.removeAria')"
                :title="t('admin.banner.removeAria')"
                :disabled="uploading"
                @click="removeImage(image.id)"
              >
                <Trash2 class="h-3.5 w-3.5" />
              </button>
            </div>
            <button
              v-if="form.images.length < MAX_IMAGES"
              type="button"
              class="flex aspect-[16/9] flex-col items-center justify-center gap-1.5 rounded-xl border border-dashed border-[#d9d9d9] text-[12.5px] text-pos-muted transition-colors hover:border-pos-faint hover:bg-pos-sunken/60"
              :disabled="uploading"
              @click="imageInput?.click()"
            >
              <ImagePlus class="h-5 w-5" />
              {{ uploading ? t('common.uploading') : t('admin.banner.addImages') }}
            </button>
          </div>
          <span class="pos-field-hint">{{ t('admin.banner.imageRequirements') }}</span>
          <input ref="imageInput" type="file" class="hidden" :accept="IMAGE_ACCEPT" multiple @change="onImageChange" />
        </div>

        <p v-if="error" class="pos-notice bg-pos-err-bg text-pos-err" role="alert">{{ error }}</p>
      </div>
      <div class="flex items-center justify-between gap-3 border-t border-pos-line bg-pos-sunken/60 px-6 py-4">
        <p class="text-[13px] text-pos-ok" aria-live="polite">{{ message }}</p>
        <button type="submit" class="pos-btn-primary" :disabled="saving">
          {{ saving ? t('common.saving') : t('admin.banner.save') }}
        </button>
      </div>
    </form>
  </section>
</template>

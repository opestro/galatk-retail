<script setup lang="ts">
import { computed, ref, onMounted, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useI18n } from 'vue-i18n'
import { Image, Store, Truck } from 'lucide-vue-next'
import { api } from '@/services/api'
import { useAuthStore } from '@/stores/auth'
import type { Shop } from '@/types/api'
import PageHeader from '@/components/ui/PageHeader.vue'
import { useToast } from '@/composables/useToast'
import { apiErrorMessage } from '@/services/products'
import HomeBannerSettings from '@/components/admin/HomeBannerSettings.vue'
import DeliveryRatesSettings from '@/components/admin/DeliveryRatesSettings.vue'

/**
 * Admin settings are three independent editors. The query `section` keeps the
 * open editor in the URL so refresh and the back button stay on the same one.
 * Panels stay mounted (`v-show`) so a delivery-price draft is not discarded
 * when the user switches tabs.
 */
const SECTIONS = ['banner', 'delivery', 'shop'] as const
type SettingsSection = (typeof SECTIONS)[number]

const { t } = useI18n()
const route = useRoute()
const router = useRouter()
const auth = useAuthStore()
const shop = ref<Shop | null>(null)
const loading = ref(true)
const form = ref({ serviceCity: '', deliveryFee: 0, address: '', creditReminderDays: 30 })
const saving = ref(false)
const toast = useToast()

const tabs = computed(() => [
  { id: 'banner' as const, label: t('admin.banner.title'), icon: Image },
  { id: 'delivery' as const, label: t('admin.settings.deliveryRates.title'), icon: Truck },
  { id: 'shop' as const, label: t('admin.settings.selectedShop'), icon: Store },
])

function isSection(value: unknown): value is SettingsSection {
  return typeof value === 'string' && (SECTIONS as readonly string[]).includes(value)
}

const activeSection = computed<SettingsSection>(() =>
  isSection(route.query.section) ? route.query.section : 'banner',
)

function selectSection(section: SettingsSection) {
  if (section === activeSection.value) return
  void router.replace({ query: { ...route.query, section } })
}

/** Arrow keys move between tabs. Horizontal direction follows the document's writing direction. */
function onTabKeydown(event: KeyboardEvent, index: number) {
  const forward = document.documentElement.dir === 'rtl' ? 'ArrowLeft' : 'ArrowRight'
  const backward = document.documentElement.dir === 'rtl' ? 'ArrowRight' : 'ArrowLeft'
  const last = tabs.value.length - 1
  let next = index
  if (event.key === forward) next = index === last ? 0 : index + 1
  else if (event.key === backward) next = index === 0 ? last : index - 1
  else if (event.key === 'Home') next = 0
  else if (event.key === 'End') next = last
  else return

  event.preventDefault()
  const section = tabs.value[next]!.id
  selectSection(section)
  requestAnimationFrame(() => document.getElementById(`settings-tab-${section}`)?.focus())
}

async function loadShop() {
  const shopId = auth.selectedShopId
  if (!shopId) {
    loading.value = false
    return
  }
  loading.value = !shop.value
  try {
    const { data } = await api.get<{ data: Shop }>(`/shops/${shopId}`)
    shop.value = data.data
    form.value = {
      serviceCity: data.data.serviceCity,
      deliveryFee: Number(data.data.deliveryFee),
      address: data.data.address,
      creditReminderDays: data.data.creditReminderDays ?? 30,
    }
  } finally {
    loading.value = false
  }
}

async function save() {
  const shopId = auth.selectedShopId
  if (!shopId || saving.value) return
  saving.value = true
  try {
    await api.patch(`/shops/${shopId}`, form.value)
    toast.success(t('admin.settings.saved'))
    await loadShop()
  } catch (e) {
    toast.error(apiErrorMessage(e, t('admin.settings.saveFailed')))
  } finally {
    saving.value = false
  }
}

onMounted(loadShop)
watch(() => auth.selectedShopId, loadShop)
</script>

<template>
  <div class="page-shell">
    <PageHeader :title="t('admin.settings.title')" :subtitle="t('admin.settings.subtitle')" />

    <nav class="pos-segmented w-fit max-w-full overflow-x-auto bg-black/[0.045]" role="tablist" :aria-label="t('admin.settings.sectionsAria')">
      <button
        v-for="tab in tabs"
        :id="`settings-tab-${tab.id}`"
        :key="tab.id"
        type="button"
        role="tab"
        class="pos-segment min-h-10 px-4 whitespace-nowrap"
        :aria-selected="activeSection === tab.id"
        :aria-controls="`settings-panel-${tab.id}`"
        :tabindex="activeSection === tab.id ? 0 : -1"
        @click="selectSection(tab.id)"
        @keydown="onTabKeydown($event, tabs.findIndex((item) => item.id === tab.id))"
      >
        <component :is="tab.icon" class="h-4 w-4" aria-hidden="true" />
        {{ tab.label }}
      </button>
    </nav>

    <div :id="`settings-panel-${activeSection}`" role="tabpanel" :aria-labelledby="`settings-tab-${activeSection}`">
      <HomeBannerSettings v-show="activeSection === 'banner'" />
      <DeliveryRatesSettings v-show="activeSection === 'delivery'" />

      <section v-show="activeSection === 'shop'" class="pos-surface flex max-w-2xl flex-col">
        <div class="px-6 pt-6 pb-2">
          <h2 class="section-title">{{ t('admin.settings.selectedShop') }}</h2>
          <p class="mt-1 text-[13px] text-pos-muted">{{ t('admin.settings.selectedShopHint') }}</p>
        </div>

        <div v-if="loading" class="flex flex-col gap-4 p-6" role="status">
          <span class="sr-only">{{ t('common.loading') }}</span>
          <div v-for="i in 4" :key="i" class="pos-skeleton h-11 rounded-xl" />
        </div>

        <form v-else-if="shop" class="flex flex-col" @submit.prevent="save">
          <div class="grid gap-4 p-6 sm:grid-cols-2">
            <div class="pos-field sm:col-span-2">
              <span class="pos-label">{{ t('admin.settings.fieldShop') }}</span>
              <p class="flex h-11 items-center rounded-xl bg-pos-sunken px-3.5 text-[14px] font-medium text-pos-ink">{{ shop.name }}</p>
            </div>
            <label class="pos-field sm:col-span-2">
              <span class="pos-label">{{ t('admin.settings.fieldAddress') }}</span>
              <input v-model="form.address" class="pos-input" />
            </label>
            <label class="pos-field">
              <span class="pos-label">{{ t('admin.settings.fieldServiceCity') }}</span>
              <input v-model="form.serviceCity" class="pos-input" />
            </label>
            <label class="pos-field">
              <span class="pos-label">{{ t('admin.settings.fieldDeliveryFee') }}</span>
              <span class="relative">
                <input v-model.number="form.deliveryFee" type="number" inputmode="decimal" min="0" class="pos-input pe-12 pos-num" />
                <span class="pointer-events-none absolute end-3.5 top-1/2 -translate-y-1/2 text-[12px] text-pos-muted">{{ t('common.currency') }}</span>
              </span>
              <span class="pos-field-hint">{{ t('admin.settings.deliveryFeeFallbackHint') }}</span>
            </label>
            <label class="pos-field">
              <span class="pos-label">{{ t('admin.settings.fieldReminderDays') }}</span>
              <input v-model.number="form.creditReminderDays" type="number" inputmode="numeric" min="1" class="pos-input pos-num" />
              <span class="pos-field-hint">{{ t('admin.settings.reminderDaysHint') }}</span>
            </label>
          </div>
          <div class="flex justify-end border-t border-pos-line bg-pos-sunken/60 px-6 py-4">
            <button type="submit" class="pos-btn-primary" :disabled="saving">{{ saving ? t('common.saving') : t('common.save') }}</button>
          </div>
        </form>

        <p v-else class="px-6 pb-6 text-[13px] text-pos-muted">{{ t('admin.settings.noShop') }}</p>
      </section>
    </div>
  </div>
</template>

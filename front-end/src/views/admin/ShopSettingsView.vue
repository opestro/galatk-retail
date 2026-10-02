<script setup lang="ts">
import { computed, ref, onMounted, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useI18n } from 'vue-i18n'
import { Image, Store, Truck } from 'lucide-vue-next'
import { api } from '@/services/api'
import { useAuthStore } from '@/stores/auth'
import type { Shop } from '@/types/api'
import PageHeader from '@/components/ui/PageHeader.vue'
import SkeletonForm from '@/components/ui/SkeletonForm.vue'
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
const message = ref('')

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
  const section = tabs.value[next].id
  selectSection(section)
  requestAnimationFrame(() => document.getElementById(`settings-tab-${section}`)?.focus())
}

async function loadShop() {
  const shopId = auth.selectedShopId
  if (!shopId) {
    loading.value = false
    return
  }
  loading.value = true
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
  if (!shopId) return
  await api.patch(`/shops/${shopId}`, form.value)
  message.value = t('admin.settings.saved')
  await loadShop()
}

onMounted(loadShop)
watch(() => auth.selectedShopId, loadShop)
</script>

<template>
  <div class="page-shell">
    <PageHeader :title="t('admin.settings.title')" />

    <nav
      class="flex gap-2 overflow-x-auto"
      role="tablist"
      :aria-label="t('admin.settings.sectionsAria')"
    >
      <button
        v-for="tab in tabs"
        :id="`settings-tab-${tab.id}`"
        :key="tab.id"
        type="button"
        role="tab"
        class="inline-flex shrink-0 items-center gap-2 rounded-md border px-4 py-2.5 text-sm font-medium"
        :class="
          activeSection === tab.id
            ? 'border-gray-900 bg-gray-900 text-white'
            : 'border-gray-200 bg-white text-gray-700 hover:bg-gray-50'
        "
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

    <div
      :id="`settings-panel-${activeSection}`"
      role="tabpanel"
      :aria-labelledby="`settings-tab-${activeSection}`"
    >
      <HomeBannerSettings v-show="activeSection === 'banner'" />
      <DeliveryRatesSettings v-show="activeSection === 'delivery'" />

      <section v-show="activeSection === 'shop'" class="flex flex-col gap-4">
        <div>
          <h3 class="section-title">{{ t('admin.settings.selectedShop') }}</h3>
          <p class="mt-1 max-w-3xl text-sm text-gray-600">{{ t('admin.settings.selectedShopHint') }}</p>
        </div>

        <SkeletonForm v-if="loading" :fields="4" />

        <form v-else-if="shop" class="card flex max-w-md flex-col gap-4" @submit.prevent="save">
          <div>
            <label class="mb-1 block text-sm font-medium text-gray-700">{{ t('admin.settings.fieldShop') }}</label>
            <p class="text-gray-900">{{ shop.name }}</p>
          </div>
          <div>
            <label class="mb-1 block text-sm font-medium text-gray-700">{{ t('admin.settings.fieldAddress') }}</label>
            <input v-model="form.address" class="input" />
          </div>
          <div>
            <label class="mb-1 block text-sm font-medium text-gray-700">{{ t('admin.settings.fieldServiceCity') }}</label>
            <input v-model="form.serviceCity" class="input" />
          </div>
          <div>
            <label class="mb-1 block text-sm font-medium text-gray-700">{{ t('admin.settings.fieldDeliveryFee') }}</label>
            <input v-model.number="form.deliveryFee" type="number" class="input" />
            <p class="mt-1 text-xs text-gray-500">{{ t('admin.settings.deliveryFeeFallbackHint') }}</p>
          </div>
          <div>
            <label class="mb-1 block text-sm font-medium text-gray-700">{{ t('admin.settings.fieldReminderDays') }}</label>
            <input v-model.number="form.creditReminderDays" type="number" min="1" class="input" />
            <p class="mt-1 text-xs text-gray-500">{{ t('admin.settings.reminderDaysHint') }}</p>
          </div>
          <p v-if="message" class="text-sm text-green-600">{{ message }}</p>
          <button type="submit" class="btn-primary self-start">{{ t('common.save') }}</button>
        </form>

        <p v-else class="card max-w-md text-sm text-gray-600">{{ t('admin.settings.noShop') }}</p>
      </section>
    </div>
  </div>
</template>

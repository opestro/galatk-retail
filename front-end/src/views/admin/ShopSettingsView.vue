<script setup lang="ts">
import { ref, onMounted, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { api } from '@/services/api'
import { useAuthStore } from '@/stores/auth'
import type { Shop } from '@/types/api'
import PageHeader from '@/components/ui/PageHeader.vue'
import SkeletonForm from '@/components/ui/SkeletonForm.vue'
import HomeBannerSettings from '@/components/admin/HomeBannerSettings.vue'
import DeliveryRatesSettings from '@/components/admin/DeliveryRatesSettings.vue'

const { t } = useI18n()
const auth = useAuthStore()
const shop = ref<Shop | null>(null)
const loading = ref(true)
const form = ref({ serviceCity: '', deliveryFee: 0, address: '', creditReminderDays: 30 })
const message = ref('')

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

    <HomeBannerSettings />

    <DeliveryRatesSettings />

    <h3 class="section-title">{{ t('admin.settings.selectedShop') }}</h3>

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
      <button type="submit" class="btn-primary">{{ t('common.save') }}</button>
    </form>
  </div>
</template>

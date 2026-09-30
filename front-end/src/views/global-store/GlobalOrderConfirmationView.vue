<script setup lang="ts">
import { computed } from 'vue'
import { useRoute, RouterLink } from 'vue-router'
import { CheckCircle2 } from 'lucide-vue-next'
import { formatDzd } from '@/utils/formatMoney'

const route = useRoute()

const orderNumbers = computed(() => {
  const raw = route.query.orders
  if (typeof raw !== 'string' || !raw) return []
  return raw.split(',').filter(Boolean)
})

const phone = computed(() => (typeof route.query.phone === 'string' ? route.query.phone : ''))
const wilaya = computed(() => (typeof route.query.wilaya === 'string' ? route.query.wilaya : ''))
const name = computed(() => (typeof route.query.name === 'string' ? route.query.name : ''))
const total = computed(() => (typeof route.query.total === 'string' ? route.query.total : ''))
</script>

<template>
  <div class="flex flex-col items-center gap-6 rounded-xl border border-gray-200 bg-white px-6 py-16 text-center">
    <div class="flex h-16 w-16 items-center justify-center rounded-full bg-green-50">
      <CheckCircle2 class="h-9 w-9 text-green-600" />
    </div>

    <div>
      <h2 class="text-2xl font-semibold text-gray-900">{{ $t('shop.confirmation.confirmedTitle') }}</h2>
      <p class="mt-2 text-gray-600">
        {{ name ? $t('shop.confirmation.thankYouNamed', { name }) : $t('shop.confirmation.thankYou') }}
      </p>
    </div>

    <div class="flex w-full max-w-md flex-col gap-2 text-start">
      <div
        v-for="orderNumber in orderNumbers"
        :key="orderNumber"
        class="rounded-lg border border-gray-200 bg-gray-50 px-4 py-3 text-sm"
      >
        <p class="text-gray-500">{{ $t('shop.confirmation.orderNumberLabel') }}</p>
        <p class="font-medium text-gray-900">{{ orderNumber }}</p>
      </div>
      <div v-if="total" class="rounded-lg border border-gray-200 px-4 py-3 text-sm">
        <p class="text-gray-500">{{ $t('shop.confirmation.totalLabel') }}</p>
        <p class="font-medium text-gray-900">{{ formatDzd(total) }}</p>
      </div>
      <div v-if="phone" class="rounded-lg border border-gray-200 px-4 py-3 text-sm">
        <p class="text-gray-500">{{ $t('shop.confirmation.contactAt') }}</p>
        <p class="font-medium text-gray-900">{{ phone }}</p>
      </div>
      <div v-if="wilaya" class="rounded-lg border border-gray-200 px-4 py-3 text-sm">
        <p class="text-gray-500">{{ $t('shop.confirmation.wilaya') }}</p>
        <p class="font-medium text-gray-900">{{ wilaya }}</p>
      </div>
    </div>

    <p v-if="orderNumbers.length > 1" class="max-w-md text-sm text-gray-500">
      {{ $t('shop.confirmation.splitOrders', { shops: orderNumbers.length, orders: orderNumbers.length }) }}
    </p>

    <div class="flex flex-wrap items-center justify-center gap-3">
      <RouterLink to="/store/account" class="btn-primary">{{ $t('shop.confirmation.viewOrders') }}</RouterLink>
      <RouterLink to="/store" class="btn-secondary">{{ $t('shop.confirmation.continueShopping') }}</RouterLink>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useRoute, RouterLink } from 'vue-router'
import { Check } from 'lucide-vue-next'
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
  <div class="sf-container flex flex-col items-center py-16 text-center md:py-24">
    <div class="sf-reveal flex h-16 w-16 items-center justify-center rounded-full border border-ink">
      <Check class="h-7 w-7 text-ink" stroke-width="1.25" />
    </div>

    <p class="sf-eyebrow sf-reveal mt-8" style="animation-delay: 80ms">{{ $t('shop.confirmation.confirmedTitle') }}</p>
    <h1 class="sf-display sf-reveal mt-4 max-w-2xl text-5xl md:text-7xl rtl:text-4xl rtl:md:text-6xl" style="animation-delay: 140ms">
      {{ name ? $t('shop.confirmation.thankYouNamed', { name }) : $t('shop.confirmation.thankYou') }}
    </h1>

    <dl class="sf-panel sf-reveal mt-12 w-full max-w-lg divide-y divide-line text-start text-sm" style="animation-delay: 220ms">
      <div v-for="orderNumber in orderNumbers" :key="orderNumber" class="flex items-center justify-between gap-4 px-6 py-4">
        <dt class="text-mute">{{ $t('shop.confirmation.orderNumberLabel') }}</dt>
        <dd class="font-medium text-ink tabular-nums">{{ orderNumber }}</dd>
      </div>
      <div v-if="total" class="flex items-center justify-between gap-4 px-6 py-4">
        <dt class="text-mute">{{ $t('shop.confirmation.totalLabel') }}</dt>
        <dd class="font-medium text-ink tabular-nums">{{ formatDzd(total) }}</dd>
      </div>
      <div v-if="phone" class="flex items-center justify-between gap-4 px-6 py-4">
        <dt class="text-mute">{{ $t('shop.confirmation.contactAt') }}</dt>
        <dd class="font-medium text-ink tabular-nums" dir="ltr">{{ phone }}</dd>
      </div>
      <div v-if="wilaya" class="flex items-center justify-between gap-4 px-6 py-4">
        <dt class="text-mute">{{ $t('shop.confirmation.wilaya') }}</dt>
        <dd class="font-medium text-ink">{{ wilaya }}</dd>
      </div>
    </dl>

    <p v-if="orderNumbers.length > 1" class="mt-5 max-w-md text-sm text-mute">
      {{ $t('shop.confirmation.splitOrders', { shops: orderNumbers.length, orders: orderNumbers.length }) }}
    </p>

    <div class="mt-12 flex flex-wrap items-center justify-center gap-3">
      <RouterLink to="/store/account" class="sf-btn">{{ $t('shop.confirmation.viewOrders') }}</RouterLink>
      <RouterLink :to="{ name: 'global-store-shop' }" class="sf-btn-outline">{{ $t('shop.confirmation.continueShopping') }}</RouterLink>
    </div>
  </div>
</template>

<script setup lang="ts">
import { useRoute, RouterLink } from 'vue-router'
import { CheckCircle } from 'lucide-vue-next'

const route = useRoute()
</script>

<template>
  <div class="flex flex-col items-center py-12 text-center">
    <CheckCircle class="mb-4 h-12 w-12 text-green-600" />
    <h2 class="text-xl font-semibold text-gray-900">{{ $t('shop.confirmation.placedTitle') }}</h2>
    <p class="mt-2 text-gray-600">{{ $t('shop.confirmation.orderNumber', { n: route.params.orderNumber }) }}</p>
    <RouterLink
      to="/store/account"
      class="btn-primary mt-6"
    >
      {{ $t('shop.confirmation.viewOrders') }}
    </RouterLink>
    <RouterLink
      :to="`/shop/${route.params.slug}`"
      class="btn-secondary mt-3"
    >
      {{ $t('shop.confirmation.continueShopping') }}
    </RouterLink>
  </div>
</template>

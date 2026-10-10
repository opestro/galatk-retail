<script setup lang="ts">
import { useRoute, RouterLink } from 'vue-router'
import { Check } from 'lucide-vue-next'

const route = useRoute()
</script>

<template>
  <div class="flex flex-col items-center py-12 text-center md:py-20">
    <div class="flex h-16 w-16 items-center justify-center rounded-full border border-ink">
      <Check class="h-7 w-7 text-ink" stroke-width="1.25" />
    </div>
    <h1 class="sf-display mt-8 text-5xl md:text-6xl rtl:text-4xl rtl:md:text-5xl">{{ $t('shop.confirmation.placedTitle') }}</h1>
    <p class="mt-4 text-mute tabular-nums">{{ $t('shop.confirmation.orderNumber', { n: route.params.orderNumber }) }}</p>
    <div class="mt-10 flex flex-wrap items-center justify-center gap-3">
      <RouterLink to="/store/account" class="sf-btn">{{ $t('shop.confirmation.viewOrders') }}</RouterLink>
      <RouterLink :to="`/shop/${route.params.slug}`" class="sf-btn-outline">{{ $t('shop.confirmation.continueShopping') }}</RouterLink>
    </div>
  </div>
</template>

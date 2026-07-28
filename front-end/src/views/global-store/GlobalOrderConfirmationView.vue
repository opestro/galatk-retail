<script setup lang="ts">
import { computed } from 'vue'
import { useRoute, RouterLink } from 'vue-router'
import { CheckCircle2, Store } from 'lucide-vue-next'

const route = useRoute()

const orderNumbers = computed(() => {
  const raw = route.query.orders
  if (typeof raw !== 'string' || !raw) return []
  return raw.split(',').filter(Boolean)
})
</script>

<template>
  <div class="flex flex-col items-center gap-6 rounded-xl border border-gray-200 bg-white px-6 py-16 text-center">
    <div class="flex h-16 w-16 items-center justify-center rounded-full bg-green-50">
      <CheckCircle2 class="h-9 w-9 text-green-600" />
    </div>

    <div>
      <h2 class="text-2xl font-semibold text-gray-900">
        {{ orderNumbers.length > 1 ? 'Orders placed!' : 'Order placed!' }}
      </h2>
      <p class="mt-2 text-gray-600">
        Thanks for shopping with us. You'll be contacted for pickup or delivery details.
      </p>
    </div>

    <div class="flex flex-col gap-2">
      <div
        v-for="orderNumber in orderNumbers"
        :key="orderNumber"
        class="flex items-center gap-2 rounded-lg border border-gray-200 bg-gray-50 px-4 py-2 text-sm"
      >
        <Store class="h-4 w-4 text-gray-500" />
        <span class="text-gray-500">Order</span>
        <span class="font-medium text-gray-900">{{ orderNumber }}</span>
      </div>
    </div>

    <p v-if="orderNumbers.length > 1" class="max-w-md text-sm text-gray-500">
      Your cart included items from {{ orderNumbers.length }} different shops, so it was split into
      {{ orderNumbers.length }} separate orders — one per shop.
    </p>

    <RouterLink to="/store" class="btn-primary">Continue shopping</RouterLink>
  </div>
</template>

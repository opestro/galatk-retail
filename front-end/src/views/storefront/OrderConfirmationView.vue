<script setup lang="ts">
import { useRoute, RouterLink } from 'vue-router'
import { CheckCircle } from 'lucide-vue-next'

const route = useRoute()
</script>

<template>
  <div class="flex flex-col items-center py-12 text-center">
    <CheckCircle class="mb-4 h-12 w-12 text-green-600" />
    <h2 class="text-xl font-semibold text-gray-900">Order placed!</h2>
    <p class="mt-2 text-gray-600">Order number: {{ route.params.orderNumber }}</p>
    <RouterLink
      :to="`/shop/${route.params.slug}`"
      class="btn-primary mt-6"
    >
      Continue shopping
    </RouterLink>
  </div>
</template>

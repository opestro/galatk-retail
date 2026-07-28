<script setup lang="ts">
import { RouterView, RouterLink, useRoute } from 'vue-router'
import { useGlobalStoreCartStore } from '@/stores/globalStoreCart'
import { ShoppingCart, Store } from 'lucide-vue-next'

const route = useRoute()
const cart = useGlobalStoreCartStore()
</script>

<template>
  <div class="min-h-screen bg-gray-50">
    <!-- Header -->
    <header class="sticky top-0 z-50 border-b border-gray-200 bg-white">
      <div class="mx-auto flex max-w-7xl items-center justify-between px-6 py-4 md:px-8">
        <RouterLink to="/store" class="flex items-center gap-2 text-lg font-semibold text-gray-900">
          <Store class="h-6 w-6" />
          <span>Galatk Store</span>
        </RouterLink>
        
        <RouterLink
          to="/store/checkout"
          class="relative flex items-center gap-2 rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
        >
          <ShoppingCart class="h-5 w-5" />
          <span class="hidden sm:inline">Cart</span>
          <span
            v-if="cart.lines.length > 0"
            class="absolute -right-1.5 -top-1.5 flex h-5 w-5 items-center justify-center rounded-full bg-gray-900 text-xs font-bold text-white"
          >
            {{ cart.lines.length }}
          </span>
        </RouterLink>
      </div>
    </header>

    <!-- Hero Banner (only on catalog page) -->
    <div v-if="route.name === 'global-store-catalog'" class="border-b border-gray-200 bg-gradient-to-br from-gray-50 to-gray-100">
      <div class="mx-auto max-w-7xl px-6 py-12 md:px-8 md:py-16">
        <div class="text-center">
          <h1 class="text-3xl font-bold text-gray-900 sm:text-4xl md:text-5xl">
            Shop from All Our Stores
          </h1>
          <p class="mx-auto mt-4 max-w-2xl text-lg text-gray-600">
            Browse products from multiple locations. Choose your preferred shop for each item and enjoy flexible pickup or delivery options.
          </p>
        </div>
      </div>
    </div>

    <!-- Main Content -->
    <main class="mx-auto w-full max-w-7xl px-6 py-8 md:px-8 md:py-12">
      <RouterView />
    </main>

    <!-- Footer -->
    <footer class="mt-auto border-t border-gray-200 bg-white">
      <div class="mx-auto max-w-7xl px-6 py-8 text-center text-sm text-gray-500 md:px-8">
        <p>© 2026 Galatk Retail. All rights reserved.</p>
        <div class="mt-2 flex items-center justify-center gap-4 text-xs">
          <RouterLink to="/login" class="hover:text-gray-700">Staff Login</RouterLink>
          <span>·</span>
          <a href="#" class="hover:text-gray-700">Support</a>
        </div>
      </div>
    </footer>
  </div>
</template>

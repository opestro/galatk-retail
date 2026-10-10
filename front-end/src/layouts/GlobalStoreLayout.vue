<script setup lang="ts">
import { onMounted } from 'vue'
import { RouterView } from 'vue-router'
import StoreHeader from '@/components/storefront/StoreHeader.vue'
import StoreFooter from '@/components/storefront/StoreFooter.vue'
import AddedToBagToast from '@/components/storefront/AddedToBagToast.vue'
import { useGlobalCatalogStore } from '@/stores/globalCatalog'

const catalog = useGlobalCatalogStore()

// Header categories, search and product rails share this single request.
onMounted(async () => {
  await catalog.load()
  if (catalog.status === 'error') {
    window.setTimeout(() => void catalog.load(), 3000)
  }
})
</script>

<template>
  <div class="storefront flex min-h-screen flex-col">
    <StoreHeader />
    <AddedToBagToast />

    <main id="main" class="flex-1" tabindex="-1">
      <RouterView v-slot="{ Component, route }">
        <Transition name="sf-page" mode="out-in">
          <component :is="Component" :key="route.path" />
        </Transition>
      </RouterView>
    </main>

    <StoreFooter />
  </div>
</template>

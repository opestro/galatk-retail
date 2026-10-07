<script setup lang="ts">
import { onBeforeUnmount, watch } from 'vue'
import { RouterLink } from 'vue-router'
import { Check, X } from 'lucide-vue-next'
import { useGlobalStoreCartStore } from '@/stores/globalStoreCart'
import ProductThumb from '@/components/storefront/ProductThumb.vue'
import { formatDzd } from '@/utils/formatMoney'

const VISIBLE_MS = 5000

const cart = useGlobalStoreCartStore()
let timer: ReturnType<typeof setTimeout> | null = null

function clearTimer() {
  if (timer) clearTimeout(timer)
  timer = null
}

function schedule() {
  clearTimer()
  timer = setTimeout(() => cart.dismissLastAdded(), VISIBLE_MS)
}

watch(
  () => cart.lastAdded?.at,
  (at) => {
    if (at) schedule()
  },
)

onBeforeUnmount(clearTimer)
</script>

<template>
  <Transition
    enter-active-class="transition duration-500 ease-[var(--ease-store)]"
    leave-active-class="transition duration-200"
    enter-from-class="opacity-0 -translate-y-3"
    leave-to-class="opacity-0"
  >
    <div
      v-if="cart.lastAdded"
      :key="cart.lastAdded.at"
      class="fixed inset-x-4 top-20 z-[60] border border-line bg-paper p-5 sm:inset-x-auto sm:end-8 sm:top-24 sm:w-[23rem] lg:top-[6.25rem]"
      role="status"
      aria-live="polite"
      @mouseenter="clearTimer"
      @mouseleave="schedule"
      @focusin="clearTimer"
    >
      <div class="flex items-center justify-between">
        <p class="sf-eyebrow flex items-center gap-2 text-ink">
          <Check class="h-4 w-4" />
          {{ $t('shop.added.title') }}
        </p>
        <button type="button" class="sf-icon-btn -me-2 h-8 w-8" :aria-label="$t('shop.added.close')" @click="cart.dismissLastAdded()">
          <X class="h-4 w-4" stroke-width="1.25" />
        </button>
      </div>
      <div class="mt-3 flex gap-4">
        <div class="aspect-[3/4] w-20 shrink-0 overflow-hidden">
          <ProductThumb :src="cart.lastAdded.line.image" :name="cart.lastAdded.line.name" />
        </div>
        <div class="min-w-0 flex-1 text-[13px]">
          <p class="sf-name truncate">{{ cart.lastAdded.line.name }}</p>
          <p v-if="cart.lastAdded.line.variantLabel" class="mt-0.5 text-mute">{{ cart.lastAdded.line.variantLabel }}</p>
          <p class="text-mute">{{ $t('shop.added.qty', { n: cart.lastAdded.quantity }) }}</p>
          <p class="sf-price mt-1">{{ formatDzd(cart.lastAdded.line.sellPrice) }}</p>
        </div>
      </div>
      <div class="mt-4 grid grid-cols-2 gap-2">
        <RouterLink :to="{ name: 'global-store-cart' }" class="sf-btn-outline min-h-11 px-3" @click="cart.dismissLastAdded()">
          {{ $t('shop.added.viewBag') }}
        </RouterLink>
        <RouterLink :to="{ name: 'global-store-checkout' }" class="sf-btn min-h-11 px-3" @click="cart.dismissLastAdded()">
          {{ $t('shop.added.checkout') }}
        </RouterLink>
      </div>
    </div>
  </Transition>
</template>

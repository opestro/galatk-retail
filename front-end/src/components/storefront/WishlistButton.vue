<script setup lang="ts">
import { computed, ref } from 'vue'
import { Heart } from 'lucide-vue-next'
import type { PublicCatalogProductSummary } from '@/services/globalStore'
import { useWishlistStore } from '@/stores/wishlist'

const props = withDefaults(
  defineProps<{
    product: PublicCatalogProductSummary
    /** `floating` sits over product imagery; `boxed` matches 48px CTAs. */
    variant?: 'floating' | 'boxed'
  }>(),
  { variant: 'floating' },
)

const wishlist = useWishlistStore()
const saved = computed(() => wishlist.has(props.product.id))
const popKey = ref(0)

function toggle() {
  if (wishlist.toggle(props.product)) popKey.value += 1
}
</script>

<template>
  <button
    type="button"
    class="inline-flex items-center justify-center text-ink transition-colors"
    :class="
      variant === 'boxed'
        ? 'h-[3.25rem] w-[3.25rem] shrink-0 cursor-pointer border border-ink/25 hover:border-ink'
        : 'h-10 w-10 cursor-pointer bg-transparent hover:bg-ivory/80'
    "
    :aria-pressed="saved"
    :aria-label="
      saved
        ? $t('shop.catalog.removeFromWishlist', { name: product.name })
        : $t('shop.catalog.addToWishlist', { name: product.name })
    "
    @click.prevent.stop="toggle"
  >
    <Heart
      :key="popKey"
      class="h-[18px] w-[18px] transition-[fill] duration-300"
      :class="[saved ? 'fill-ink' : variant === 'floating' ? 'fill-ivory/70' : '', popKey ? 'sf-pop' : '']"
      stroke-width="1.25"
    />
  </button>
</template>

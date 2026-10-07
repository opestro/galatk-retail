<script setup lang="ts">
import { ref, toRef } from 'vue'
import { RouterLink } from 'vue-router'
import { Heart, ShoppingBag, User, X } from 'lucide-vue-next'
import LanguageSwitcher from '@/components/common/LanguageSwitcher.vue'
import { useDialogA11y } from '@/composables/useDialogA11y'
import type { CatalogCategory } from '@/utils/storeCatalog'

const props = defineProps<{
  open: boolean
  categories: CatalogCategory[]
  accountTo: string
  accountLabel: string
  bagCount: number
  wishlistCount: number
}>()

const emit = defineEmits<{ close: [] }>()
const panel = ref<HTMLElement | null>(null)

useDialogA11y(toRef(props, 'open'), panel, () => emit('close'))
</script>

<template>
  <Teleport to="body">
    <div class="storefront contents">
      <Transition
        enter-active-class="transition-opacity duration-300"
        leave-active-class="transition-opacity duration-200"
        enter-from-class="opacity-0"
        leave-to-class="opacity-0"
      >
        <button
          v-if="open"
          type="button"
          class="fixed inset-0 z-[70] cursor-default bg-ink/30"
          tabindex="-1"
          aria-hidden="true"
          @click="emit('close')"
        />
      </Transition>
      <Transition
        enter-active-class="transition-transform duration-500 ease-[var(--ease-store)]"
        leave-active-class="transition-transform duration-300 ease-in"
        enter-from-class="-translate-x-full rtl:translate-x-full"
        leave-to-class="-translate-x-full rtl:translate-x-full"
      >
        <div
          v-if="open"
          ref="panel"
          role="dialog"
          aria-modal="true"
          :aria-label="$t('shop.nav.menu')"
          class="storefront fixed inset-y-0 start-0 z-[80] flex w-[86vw] max-w-sm flex-col border-e border-line"
        >
          <div class="flex h-16 items-center justify-between border-b border-line px-6">
            <span class="sf-wordmark text-lg">
              {{ $t('shop.brand.wordmark') }}
            </span>
            <button type="button" class="sf-icon-btn -me-2" :aria-label="$t('shop.nav.closeMenu')" @click="emit('close')">
              <X class="h-5 w-5" stroke-width="1.25" />
            </button>
          </div>

          <nav class="flex-1 overflow-y-auto px-6 py-8" :aria-label="$t('shop.nav.primary')">
            <ul class="flex flex-col">
              <li>
                <RouterLink to="/store" class="block py-2.5 font-display text-[2rem] font-light leading-tight text-ink rtl:text-[1.6rem]" @click="emit('close')">
                  {{ $t('shop.nav.home') }}
                </RouterLink>
              </li>
              <li>
                <RouterLink
                  :to="{ name: 'global-store-shop' }"
                  class="block py-2.5 font-display text-[2rem] font-light leading-tight text-ink rtl:text-[1.6rem]"
                  @click="emit('close')"
                >
                  {{ $t('shop.nav.shopAll') }}
                </RouterLink>
              </li>
              <li>
                <RouterLink
                  :to="{ name: 'global-store-shop', query: { sort: 'new' } }"
                  class="block py-2.5 font-display text-[2rem] font-light leading-tight text-ink rtl:text-[1.6rem]"
                  @click="emit('close')"
                >
                  {{ $t('shop.nav.newIn') }}
                </RouterLink>
              </li>
            </ul>

            <template v-if="categories.length > 0">
              <p class="sf-eyebrow mt-10">{{ $t('shop.nav.categories') }}</p>
              <ul class="mt-3 flex flex-col">
                <li v-for="category in categories" :key="category.name">
                  <RouterLink
                    :to="{ name: 'global-store-shop', query: { category: category.name } }"
                    class="flex min-h-11 items-center justify-between border-b border-line/70 text-[14px] text-ink"
                    @click="emit('close')"
                  >
                    {{ category.name }}
                    <span class="text-xs text-mute tabular-nums">{{ category.count }}</span>
                  </RouterLink>
                </li>
              </ul>
            </template>
          </nav>

          <div class="border-t border-line px-6 py-5">
            <ul class="flex flex-col gap-1 text-sm text-ink">
              <li>
                <RouterLink :to="accountTo" class="flex items-center gap-3 py-2" @click="emit('close')">
                  <User class="h-[18px] w-[18px]" stroke-width="1.25" />
                  {{ accountLabel }}
                </RouterLink>
              </li>
              <li>
                <RouterLink :to="{ name: 'global-store-wishlist' }" class="flex items-center gap-3 py-2" @click="emit('close')">
                  <Heart class="h-[18px] w-[18px]" stroke-width="1.25" />
                  {{ $t('shop.nav.wishlist') }}
                  <span v-if="wishlistCount" class="text-mute">({{ wishlistCount }})</span>
                </RouterLink>
              </li>
              <li>
                <RouterLink :to="{ name: 'global-store-cart' }" class="flex items-center gap-3 py-2" @click="emit('close')">
                  <ShoppingBag class="h-[18px] w-[18px]" stroke-width="1.25" />
                  {{ $t('shop.nav.cart') }}
                  <span v-if="bagCount" class="text-mute">({{ bagCount }})</span>
                </RouterLink>
              </li>
            </ul>
            <div class="mt-4 flex items-center justify-between border-t border-line pt-4 text-ink">
              <span class="text-xs text-mute">{{ $t('shop.nav.language') }}</span>
              <LanguageSwitcher variant="minimal" placement="top" />
            </div>
          </div>
        </div>
      </Transition>
    </div>
  </Teleport>
</template>

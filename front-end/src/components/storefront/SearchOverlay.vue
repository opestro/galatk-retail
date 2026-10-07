<script setup lang="ts">
import { computed, ref, toRef, watch } from 'vue'
import { RouterLink, useRouter } from 'vue-router'
import { ArrowRight, Search, X } from 'lucide-vue-next'
import { useGlobalCatalogStore } from '@/stores/globalCatalog'
import { useRecentSearchesStore } from '@/stores/recentSearches'
import { useDialogA11y } from '@/composables/useDialogA11y'
import ProductThumb from '@/components/storefront/ProductThumb.vue'
import { formatFromPrice } from '@/utils/formatMoney'
import { matchesQuery, primaryImageUrl, productMeta } from '@/utils/storeCatalog'
import type { PublicCatalogProductSummary } from '@/services/globalStore'

const props = defineProps<{ open: boolean }>()
const emit = defineEmits<{ close: [] }>()

const router = useRouter()
const catalog = useGlobalCatalogStore()
const recent = useRecentSearchesStore()
const query = ref('')
const panel = ref<HTMLElement | null>(null)
const input = ref<HTMLInputElement | null>(null)

useDialogA11y(toRef(props, 'open'), panel, () => emit('close'), input)

watch(
  () => props.open,
  (open) => {
    if (open) void catalog.load()
    else query.value = ''
  },
)

const trimmed = computed(() => query.value.trim())
const matches = computed(() =>
  trimmed.value ? catalog.products.filter((product) => matchesQuery(product, trimmed.value)) : [],
)
const preview = computed(() => matches.value.slice(0, 6))

function productTo(product: PublicCatalogProductSummary) {
  return { name: 'global-store-product' as const, params: { productId: product.slug || product.id } }
}

function submit() {
  if (!trimmed.value) return
  recent.add(trimmed.value)
  void router.push({ name: 'global-store-shop', query: { q: trimmed.value } })
  emit('close')
}

function pick(product: PublicCatalogProductSummary) {
  if (trimmed.value) recent.add(trimmed.value)
  void router.push(productTo(product))
  emit('close')
}
</script>

<template>
  <Teleport to="body">
    <Transition
      enter-active-class="transition-opacity duration-300"
      leave-active-class="transition-opacity duration-200"
      enter-from-class="opacity-0"
      leave-to-class="opacity-0"
    >
      <div v-if="open" class="storefront fixed inset-0 z-[70] bg-transparent">
        <button
          type="button"
          class="absolute inset-0 h-full w-full cursor-default bg-ink/25 backdrop-blur-[2px]"
          tabindex="-1"
          aria-hidden="true"
          @click="emit('close')"
        />
        <div
          ref="panel"
          role="dialog"
          aria-modal="true"
          :aria-label="$t('shop.search.label')"
          class="relative max-h-[100dvh] overflow-y-auto border-b border-line bg-ivory"
        >
          <div class="sf-container pb-12 pt-6 md:pb-20 md:pt-10">
            <form class="flex items-center gap-4 border-b border-ink pb-4" role="search" @submit.prevent="submit">
              <Search class="h-5 w-5 shrink-0 text-ink" stroke-width="1.25" />
              <label for="store-search" class="sr-only">{{ $t('shop.search.label') }}</label>
              <input
                id="store-search"
                ref="input"
                v-model="query"
                type="search"
                autocomplete="off"
                enterkeyhint="search"
                :placeholder="$t('shop.search.placeholder')"
                class="min-w-0 flex-1 bg-transparent font-display text-[1.75rem] font-light text-ink placeholder:text-mute/60 focus:outline-none md:text-5xl rtl:text-2xl rtl:md:text-4xl"
              />
              <button type="button" class="sf-icon-btn" :aria-label="$t('shop.search.close')" @click="emit('close')">
                <X class="h-5 w-5" stroke-width="1.25" />
              </button>
            </form>

            <!-- Live results -->
            <div v-if="trimmed" class="mt-10" aria-live="polite">
              <template v-if="preview.length > 0">
                <div class="flex items-baseline justify-between gap-4">
                  <p class="sf-eyebrow">{{ $t('shop.search.results') }}</p>
                  <button type="button" class="sf-link" @click="submit">
                    {{ $t('shop.search.viewAll') }} ({{ matches.length }})
                    <ArrowRight class="h-4 w-4 rtl:-scale-x-100" />
                  </button>
                </div>
                <ul class="mt-6 grid grid-cols-1 gap-x-10 gap-y-5 sm:grid-cols-2 lg:grid-cols-3">
                  <li v-for="product in preview" :key="product.id">
                    <button
                      type="button"
                      class="group flex w-full cursor-pointer items-center gap-5 text-start"
                      @click="pick(product)"
                    >
                      <span class="aspect-[3/4] w-16 shrink-0 overflow-hidden">
                        <ProductThumb :src="primaryImageUrl(product)" :name="product.name" />
                      </span>
                      <span class="min-w-0">
                        <span class="sf-name block truncate group-hover:opacity-60">{{ product.name }}</span>
                        <span v-if="productMeta(product)" class="block text-xs text-mute">{{ productMeta(product) }}</span>
                        <span class="sf-price mt-1 block text-[13px]">
                          {{ formatFromPrice(product.fromPrice, product.hasPriceRange) }}
                        </span>
                      </span>
                    </button>
                  </li>
                </ul>
              </template>
              <div v-else-if="catalog.status !== 'loading'" class="py-6">
                <p class="sf-title text-xl">{{ $t('shop.search.noResults', { q: trimmed }) }}</p>
                <p class="mt-2 text-sm text-mute">{{ $t('shop.search.noResultsHint') }}</p>
              </div>
            </div>

            <!-- Suggestions -->
            <div
              v-if="!trimmed || (preview.length === 0 && catalog.status !== 'loading')"
              class="mt-10 grid gap-10 md:grid-cols-2"
            >
              <div v-if="recent.queries.length > 0">
                <div class="flex items-center justify-between">
                  <p class="sf-eyebrow">{{ $t('shop.search.recent') }}</p>
                  <button type="button" class="min-h-11 cursor-pointer text-xs text-mute underline-offset-4 hover:text-ink hover:underline" @click="recent.clear()">
                    {{ $t('shop.search.clearRecent') }}
                  </button>
                </div>
                <ul class="mt-4 flex flex-wrap gap-2">
                  <li v-for="item in recent.queries" :key="item">
                    <button type="button" class="sf-chip" @click="query = item">{{ item }}</button>
                  </li>
                </ul>
              </div>
              <div v-if="catalog.categories.length > 0">
                <p class="sf-eyebrow">{{ $t('shop.search.browse') }}</p>
                <ul class="mt-4 flex flex-wrap gap-2">
                  <li v-for="category in catalog.categories" :key="category.name">
                    <RouterLink
                      :to="{ name: 'global-store-shop', query: { category: category.name } }"
                      class="sf-chip"
                      @click="emit('close')"
                    >
                      {{ category.name }}
                      <span class="text-mute">{{ category.count }}</span>
                    </RouterLink>
                  </li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

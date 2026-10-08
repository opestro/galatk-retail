<script setup lang="ts">
import { computed, ref } from 'vue'
import { Check, ChevronDown, Languages } from 'lucide-vue-next'
import { useI18nStore } from '@/stores/i18nStore'

const props = withDefaults(
  defineProps<{
    /**
     * `minimal` is the borderless text style used by the customer storefront;
     * `segmented` is the POS one-tap toggle (no menu).
     */
    variant?: 'default' | 'minimal' | 'segmented'
    /** Which way the menu opens (storefront footer opens upwards). */
    placement?: 'bottom' | 'top'
  }>(),
  { variant: 'default', placement: 'bottom' },
)

const i18nStore = useI18nStore()
const isOpen = ref(false)

function toggleDropdown() {
  isOpen.value = !isOpen.value
}

function closeDropdown() {
  isOpen.value = false
}

function selectLanguage(langCode: string) {
  i18nStore.setLocale(langCode)
  closeDropdown()
}

const currentLanguage = computed(() => i18nStore.currentLocaleInfo)
const minimal = computed(() => props.variant === 'minimal')

/** Compact toggle labels: script-native, so each reads in its own language. */
const SHORT_LABELS: Record<string, string> = { en: 'EN', ar: 'عربي' }
</script>

<template>
  <div
    v-if="variant === 'segmented'"
    class="pos-segmented h-10 shrink-0"
    role="group"
    :aria-label="$t('language.switch')"
  >
    <button
      v-for="lang in i18nStore.supportedLocales"
      :key="lang.code"
      type="button"
      class="pos-segment min-h-8 min-w-9 px-2.5"
      :lang="lang.code"
      :aria-pressed="i18nStore.currentLocale === lang.code"
      :aria-label="lang.nativeName"
      :title="lang.nativeName"
      @click="i18nStore.setLocale(lang.code)"
    >
      {{ SHORT_LABELS[lang.code] ?? lang.code.toUpperCase() }}
    </button>
  </div>

  <div v-else class="relative" @keydown.esc="closeDropdown">
    <button
      v-if="minimal"
      type="button"
      class="flex min-h-9 cursor-pointer items-center gap-1.5 text-[12px] font-medium tracking-[0.06em] text-current transition-opacity hover:opacity-70"
      :aria-label="$t('language.switch')"
      :aria-expanded="isOpen"
      aria-haspopup="true"
      @click="toggleDropdown"
    >
      <span>{{ currentLanguage?.nativeName }}</span>
      <ChevronDown class="h-3.5 w-3.5 transition-transform" :class="isOpen ? 'rotate-180' : ''" />
    </button>
    <button
      v-else
      type="button"
      class="flex min-h-9 items-center gap-2 rounded-lg border border-gray-300 bg-white px-2.5 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-50"
      :aria-label="$t('language.switch')"
      :aria-expanded="isOpen"
      @click="toggleDropdown"
    >
      <Languages class="h-4 w-4" />
      <span class="hidden sm:inline">{{ currentLanguage?.nativeName }}</span>
      <ChevronDown class="h-4 w-4 opacity-50" />
    </button>

    <button
      v-if="isOpen"
      type="button"
      class="fixed inset-0 z-40 cursor-default"
      tabindex="-1"
      aria-hidden="true"
      @click="closeDropdown"
    />

    <Transition :name="placement === 'top' ? 'sf-menu-up' : 'sf-menu'">
    <div
      v-if="isOpen"
      class="absolute end-0 z-50 w-48 overflow-hidden py-1"
      :class="[
        minimal ? 'storefront border border-line bg-paper text-ink' : 'rounded-lg border border-gray-200 bg-white',
        placement === 'top' ? 'bottom-full mb-2' : 'mt-2',
      ]"
    >
      <button
        v-for="lang in i18nStore.supportedLocales"
        :key="lang.code"
        type="button"
        class="flex w-full items-center justify-between px-4 py-2.5 text-sm"
        :class="[
          minimal ? 'min-h-11 cursor-pointer text-ink hover:bg-cream' : 'text-gray-800 hover:bg-gray-50',
          i18nStore.currentLocale === lang.code ? (minimal ? 'bg-cream font-medium' : 'bg-gray-100 font-medium') : '',
        ]"
        @click="selectLanguage(lang.code)"
      >
        <span class="flex items-center gap-2">
          <span>{{ lang.nativeName }}</span>
          <span class="text-xs" :class="minimal ? 'text-mute' : 'text-gray-500'">{{ lang.name }}</span>
        </span>
        <Check v-if="i18nStore.currentLocale === lang.code" class="h-4 w-4" :class="minimal ? 'text-ink' : 'text-gray-900'" />
      </button>
    </div>
    </Transition>
  </div>
</template>

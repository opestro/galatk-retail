<script setup lang="ts">
import { computed, ref } from 'vue'
import { Check, ChevronDown, Languages } from 'lucide-vue-next'
import { useI18nStore } from '@/stores/i18nStore'

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
</script>

<template>
  <div class="relative">
    <button
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

    <div
      v-if="isOpen"
      class="absolute end-0 z-50 mt-2 w-48 overflow-hidden rounded-lg border border-gray-200 bg-white py-1"
    >
      <button
        v-for="lang in i18nStore.supportedLocales"
        :key="lang.code"
        type="button"
        class="flex w-full items-center justify-between px-4 py-2.5 text-sm text-gray-800 hover:bg-gray-50"
        :class="i18nStore.currentLocale === lang.code ? 'bg-gray-100 font-medium' : ''"
        @click="selectLanguage(lang.code)"
      >
        <span class="flex items-center gap-2">
          <span>{{ lang.nativeName }}</span>
          <span class="text-xs text-gray-500">{{ lang.name }}</span>
        </span>
        <Check v-if="i18nStore.currentLocale === lang.code" class="h-4 w-4 text-gray-900" />
      </button>
    </div>
  </div>
</template>

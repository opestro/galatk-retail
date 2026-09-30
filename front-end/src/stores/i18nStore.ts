import { defineStore } from 'pinia'
import { computed, ref } from 'vue'
import i18n, {
  applyDocumentLocale,
  isSupportedLocale,
  isRtlLocale,
  LOCALE_STORAGE_KEY,
  supportedLocales,
  type LocaleCode,
  getDefaultLocale,
} from '@/i18n'

/**
 * Persists the active storefront / staff locale and keeps `html[dir]` in sync
 * so Arabic layouts flip to RTL without per-page CSS forks.
 */
export const useI18nStore = defineStore('i18n', () => {
  const currentLocale = ref<LocaleCode>(getDefaultLocale())

  const isRtl = computed(() => isRtlLocale(currentLocale.value))
  const direction = computed(() => (isRtl.value ? 'rtl' : 'ltr'))
  const currentLocaleInfo = computed(() =>
    supportedLocales.find((locale) => locale.code === currentLocale.value),
  )

  function setLocale(locale: string): void {
    if (!isSupportedLocale(locale)) {
      console.warn(`Locale "${locale}" is not supported`)
      return
    }

    currentLocale.value = locale
    localStorage.setItem(LOCALE_STORAGE_KEY, locale)
    i18n.global.locale.value = locale
    applyDocumentLocale(locale)
  }

  function initializeLocale(): void {
    setLocale(currentLocale.value)
  }

  return {
    currentLocale,
    isRtl,
    direction,
    currentLocaleInfo,
    supportedLocales,
    setLocale,
    initializeLocale,
  }
})

import { createI18n } from 'vue-i18n'
import en from './locales/en.json'
import ar from './locales/ar.json'

export const LOCALE_STORAGE_KEY = 'galatk_retail_locale'

export const supportedLocales = [
  { code: 'en', name: 'English', nativeName: 'English', dir: 'ltr' as const },
  { code: 'ar', name: 'Arabic', nativeName: 'العربية', dir: 'rtl' as const },
] as const

export type LocaleCode = (typeof supportedLocales)[number]['code']

export function isSupportedLocale(value: string): value is LocaleCode {
  return supportedLocales.some((locale) => locale.code === value)
}

export function isRtlLocale(locale: string): boolean {
  return supportedLocales.find((item) => item.code === locale)?.dir === 'rtl'
}

/**
 * Resolves the initial UI locale from localStorage, then the browser language.
 * English is the fallback so existing staff workflows stay unchanged.
 */
export function getDefaultLocale(): LocaleCode {
  const saved = localStorage.getItem(LOCALE_STORAGE_KEY)
  if (saved && isSupportedLocale(saved)) {
    return saved
  }

  const browserLang = navigator.language.split('-')[0]
  if (browserLang && isSupportedLocale(browserLang)) {
    return browserLang
  }

  return 'en'
}

export function applyDocumentLocale(locale: LocaleCode): void {
  document.documentElement.setAttribute('lang', locale)
  document.documentElement.setAttribute('dir', isRtlLocale(locale) ? 'rtl' : 'ltr')
}

const i18n = createI18n({
  legacy: false,
  globalInjection: true,
  locale: getDefaultLocale(),
  fallbackLocale: 'en',
  messages: {
    en,
    ar,
  },
})

export default i18n

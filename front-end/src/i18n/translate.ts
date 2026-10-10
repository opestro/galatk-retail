import i18n from '@/i18n'

/**
 * Translation function usable from stores, services, and receipt HTML
 * generators that sit outside a Vue component setup() context.
 */
export function translate(key: string, values?: Record<string, unknown>): string {
  return values ? String(i18n.global.t(key, values)) : String(i18n.global.t(key))
}

export function numberLocale(): string {
  const locale = i18n.global.locale.value
  if (locale === 'ar') return 'ar-DZ'
  if (locale === 'fr') return 'fr-DZ'
  return 'en-US'
}

/** Locale for number/date formatting; Arabic uses Arabic-Indic digits. */
export function displayLocale(): string {
  const locale = numberLocale()
  return locale === 'ar-DZ' ? 'ar-DZ-u-nu-arab' : locale
}

import i18n from '@/i18n'

/**
 * Translation function usable from stores, services, and receipt HTML
 * generators that sit outside a Vue component setup() context.
 */
export function translate(key: string, values?: Record<string, unknown>): string {
  return values ? String(i18n.global.t(key, values)) : String(i18n.global.t(key))
}

export function numberLocale(): string {
  return i18n.global.locale.value === 'ar' ? 'ar-DZ' : 'en-US'
}

/**
 * Light Algerian mobile validation for guest checkout.
 * Accepts 05/06/07 local numbers, optional +213 / 213, and spaces/dashes.
 */

const LOCAL = /^0[567]\d{8}$/

export function digitsOnly(value: string): string {
  return value.replace(/\D/g, '')
}

export function normalizeAlgerianPhone(value: string | null | undefined): string | null {
  const digits = digitsOnly(value ?? '')
  if (!digits) return null

  let local = digits
  if (digits.startsWith('213') && digits.length === 12) {
    local = `0${digits.slice(3)}`
  } else if (digits.length === 9 && /^[567]/.test(digits)) {
    local = `0${digits}`
  }

  return LOCAL.test(local) ? local : null
}

/** Phone keys to try when looking up an existing Customer row. */
export function phoneLookupKeys(value: string): string[] {
  const trimmed = value.trim()
  const keys = new Set<string>()
  if (trimmed) keys.add(trimmed)
  const canonical = normalizeAlgerianPhone(value)
  if (canonical) {
    keys.add(canonical)
    keys.add(`+213${canonical.slice(1)}`)
    keys.add(`213${canonical.slice(1)}`)
  }
  return [...keys]
}

export function validateCustomerName(value: string | null | undefined): string | null {
  const name = (value ?? '').trim().replace(/\s+/g, ' ')
  if (name.length < 2) return null
  if (name.length > 80) return null
  return name
}

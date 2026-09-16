const LOCAL = /^0[567]\d{8}$/

export function normalizeAlgerianPhone(value: string | null | undefined): string | null {
  const digits = (value ?? '').replace(/\D/g, '')
  if (!digits) return null

  let local = digits
  if (digits.startsWith('213') && digits.length === 12) {
    local = `0${digits.slice(3)}`
  } else if (digits.length === 9 && /^[567]/.test(digits)) {
    local = `0${digits}`
  }

  return LOCAL.test(local) ? local : null
}

export function validateCustomerName(value: string | null | undefined): string | null {
  const name = (value ?? '').trim().replace(/\s+/g, ' ')
  if (name.length < 2 || name.length > 80) return null
  return name
}

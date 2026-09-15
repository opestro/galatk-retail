import { describe, expect, it } from 'vitest'
import { normalizeAlgerianPhone, phoneLookupKeys, validateCustomerName } from '../src/shared/validation/algerianPhone.js'
import { canonicalWilaya, isValidWilaya } from '../src/shared/geo/algeriaWilayas.js'

describe('Algerian phone normalization', () => {
  it('accepts 05/06/07 local numbers', () => {
    expect(normalizeAlgerianPhone('0551234567')).toBe('0551234567')
    expect(normalizeAlgerianPhone('06 61 23 45 67')).toBe('0661234567')
    expect(normalizeAlgerianPhone('077-123-4567')).toBe('0771234567')
  })

  it('accepts +213 international form', () => {
    expect(normalizeAlgerianPhone('+213551234567')).toBe('0551234567')
    expect(normalizeAlgerianPhone('213661234567')).toBe('0661234567')
  })

  it('rejects invalid numbers', () => {
    expect(normalizeAlgerianPhone('0412345678')).toBeNull()
    expect(normalizeAlgerianPhone('05512')).toBeNull()
    expect(normalizeAlgerianPhone('')).toBeNull()
  })

  it('builds lookup keys for returning customers', () => {
    expect(phoneLookupKeys('0551234567')).toEqual(
      expect.arrayContaining(['0551234567', '+213551234567', '213551234567']),
    )
  })
})

describe('customer name and wilaya', () => {
  it('trims and requires a real name', () => {
    expect(validateCustomerName('  Ahmed Ali  ')).toBe('Ahmed Ali')
    expect(validateCustomerName('A')).toBeNull()
    expect(validateCustomerName('   ')).toBeNull()
  })

  it('accepts official wilayas case-insensitively', () => {
    expect(isValidWilaya('Blida')).toBe(true)
    expect(canonicalWilaya('blida')).toBe('Blida')
    expect(isValidWilaya('Narnia')).toBe(false)
  })
})

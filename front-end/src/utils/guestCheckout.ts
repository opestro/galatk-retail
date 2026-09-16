import { isValidWilaya } from '@/data/algeriaWilayas'
import { normalizeAlgerianPhone, validateCustomerName } from '@/utils/algerianPhone'
import axios from 'axios'

export interface GuestCustomerFields {
  customerName: string
  customerPhone: string
  customerWilaya: string
}

export function emptyGuestCustomer(): GuestCustomerFields {
  return { customerName: '', customerPhone: '', customerWilaya: '' }
}

export function validateGuestCustomer(form: GuestCustomerFields) {
  const errors = { name: '', phone: '', wilaya: '' }
  if (!validateCustomerName(form.customerName)) {
    errors.name = 'Please enter your full name.'
  }
  if (!normalizeAlgerianPhone(form.customerPhone)) {
    errors.phone = 'Please enter a valid Algerian phone number (05, 06, or 07).'
  }
  if (!isValidWilaya(form.customerWilaya)) {
    errors.wilaya = 'Please select a wilaya.'
  }
  const valid = !errors.name && !errors.phone && !errors.wilaya
  return { valid, errors }
}

export function checkoutErrorMessage(err: unknown): string {
  if (axios.isAxiosError(err)) {
    const type = err.response?.data?.type as string | undefined
    const message = err.response?.data?.message as string | undefined
    if (type === 'INSUFFICIENT_STOCK') {
      return 'Not enough stock for this item. Please update the quantity.'
    }
    return message || 'Could not place the order. Please try again.'
  }
  return 'Could not place the order. Please try again.'
}

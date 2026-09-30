import { isValidWilaya } from '@/data/algeriaWilayas'
import { normalizeAlgerianPhone, validateCustomerName } from '@/utils/algerianPhone'
import { translate } from '@/i18n/translate'
import axios from 'axios'

export const MIN_CUSTOMER_PASSWORD_LENGTH = 6

export interface GuestCustomerFields {
  customerName: string
  customerPhone: string
  customerWilaya: string
  password: string
  passwordConfirm: string
}

export function emptyGuestCustomer(): GuestCustomerFields {
  return { customerName: '', customerPhone: '', customerWilaya: '', password: '', passwordConfirm: '' }
}

export function validateGuestCustomer(form: GuestCustomerFields) {
  const errors = { name: '', phone: '', wilaya: '' }
  if (!validateCustomerName(form.customerName)) {
    errors.name = translate('shop.guest.errorName')
  }
  if (!normalizeAlgerianPhone(form.customerPhone)) {
    errors.phone = translate('shop.guest.errorPhone')
  }
  if (!isValidWilaya(form.customerWilaya)) {
    errors.wilaya = translate('shop.guest.errorWilaya')
  }
  const valid = !errors.name && !errors.phone && !errors.wilaya
  return { valid, errors }
}

export function checkoutErrorMessage(err: unknown): string {
  if (axios.isAxiosError(err)) {
    const type = err.response?.data?.type as string | undefined
    const message = err.response?.data?.message as string | undefined
    if (type === 'INSUFFICIENT_STOCK') {
      return translate('shop.checkout.insufficientStock')
    }
    if (type === 'ACCOUNT_EXISTS') {
      return message || translate('shop.checkout.accountExists')
    }
    return message || translate('shop.checkout.genericError')
  }
  return translate('shop.checkout.genericError')
}

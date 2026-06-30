import { SaleStatus, StaffRole } from '@prisma/client'
import { CustomError } from '../types/error_type.js'

export function isSameCalendarDay(date: Date): boolean {
  const now = new Date()
  return (
    date.getUTCFullYear() === now.getUTCFullYear() &&
    date.getUTCMonth() === now.getUTCMonth() &&
    date.getUTCDate() === now.getUTCDate()
  )
}

export function assertCanVoidSale(
  staffRole: StaffRole,
  staffId: string,
  sale: { cashierId: string; status: SaleStatus; createdAt: Date },
): void {
  if (sale.status === SaleStatus.CANCELLED) {
    throw new CustomError('ALREADY_VOIDED', 'Sale is already voided', 400)
  }

  if (staffRole === StaffRole.CASHIER) {
    if (sale.cashierId !== staffId) {
      throw new CustomError('VOID_DENIED', 'Cashiers can only void their own sales', 403)
    }
    if (!isSameCalendarDay(sale.createdAt)) {
      throw new CustomError('VOID_DENIED', 'Cashiers can only void same-day sales', 403)
    }
  }
}

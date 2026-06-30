import { describe, it, expect } from 'vitest'
import { isSameCalendarDay, assertCanVoidSale } from '../src/shared/pos/voidRules.js'
import { SaleStatus, StaffRole } from '@prisma/client'
import { CustomError } from '../src/shared/types/error_type.js'

describe('POS void rules', () => {
  it('allows void on same calendar day', () => {
    expect(isSameCalendarDay(new Date())).toBe(true)
  })

  it('denies void for previous day', () => {
    const yesterday = new Date()
    yesterday.setUTCDate(yesterday.getUTCDate() - 1)
    expect(isSameCalendarDay(yesterday)).toBe(false)
  })
})

describe('assertCanVoidSale', () => {
  const baseSale = {
    cashierId: 'cashier-1',
    status: SaleStatus.COMPLETED,
    createdAt: new Date(),
  }

  it('allows cashier to void own same-day sale', () => {
    expect(() =>
      assertCanVoidSale(StaffRole.CASHIER, 'cashier-1', baseSale),
    ).not.toThrow()
  })

  it('denies cashier voiding another cashiers sale', () => {
    expect(() =>
      assertCanVoidSale(StaffRole.CASHIER, 'cashier-2', baseSale),
    ).toThrow(CustomError)
  })

  it('allows manager to void any sale', () => {
    const oldSale = { ...baseSale, createdAt: new Date('2020-01-01') }
    expect(() =>
      assertCanVoidSale(StaffRole.MANAGER, 'manager-1', oldSale),
    ).not.toThrow()
  })

  it('rejects already voided sale', () => {
    expect(() =>
      assertCanVoidSale(StaffRole.OWNER, 'owner-1', {
        ...baseSale,
        status: SaleStatus.CANCELLED,
      }),
    ).toThrow(CustomError)
  })
})

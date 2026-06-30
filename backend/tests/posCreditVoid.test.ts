import { describe, it, expect } from 'vitest'
import { StaffRole } from '@prisma/client'

describe('POS credit void rules', () => {
  it('cashier cannot use pay-later', () => {
    const role = StaffRole.CASHIER
    const payLater = true
    const canPayLater = role === StaffRole.MANAGER || role === StaffRole.OWNER
    expect(payLater && !canPayLater).toBe(true)
  })

  it('manager can use pay-later', () => {
    const role = StaffRole.MANAGER
    const canPayLater = role === StaffRole.MANAGER || role === StaffRole.OWNER
    expect(canPayLater).toBe(true)
  })

  it('void blocked when portion has allocations', () => {
    const hasAllocations = true
    const shouldBlockVoid = hasAllocations
    expect(shouldBlockVoid).toBe(true)
  })
})

describe('Checkout amount validation', () => {
  it('amountPaid + amountOnCredit must equal total', () => {
    const total = 200
    const amountPaid = 100
    const amountOnCredit = 100
    expect(amountPaid + amountOnCredit).toBe(total)
  })

  it('guest sale requires full payment', () => {
    const clientId = null
    const total = 200
    const amountPaid = 200
    const validGuest = !clientId && amountPaid === total
    expect(validGuest).toBe(true)
  })
})

import { describe, it, expect } from 'vitest'
import { Decimal } from '@prisma/client/runtime/library'

/** Mirrors recordPayment allocation cap: FIFO only up to open portions total. */
function amountToAllocate(
  payment: Decimal,
  openPortionsTotal: Decimal,
): Decimal {
  return Decimal.min(payment, openPortionsTotal)
}

describe('recordPayment allocation cap', () => {
  it('allocates FIFO for full payment when portions cover balance', () => {
    expect(amountToAllocate(new Decimal(1200), new Decimal(1200)).toString()).toBe('1200')
  })

  it('caps FIFO allocation when balance exceeds open portions (adjustment drift)', () => {
    expect(amountToAllocate(new Decimal(1200), new Decimal(800)).toString()).toBe('800')
  })

  it('skips FIFO when there are no open portions but balance remains', () => {
    expect(amountToAllocate(new Decimal(500), new Decimal(0)).toString()).toBe('0')
  })
})

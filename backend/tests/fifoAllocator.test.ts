import { describe, it, expect } from 'vitest'
import { Decimal } from '@prisma/client/runtime/library'
import { allocateFifo } from '../src/shared/credit/fifoAllocator.js'

describe('allocateFifo', () => {
  it('allocates to oldest portion first', () => {
    const portions = [
      { id: 'p1', remainingAmount: new Decimal(100), createdAt: new Date('2026-01-01') },
      { id: 'p2', remainingAmount: new Decimal(200), createdAt: new Date('2026-02-01') },
    ]
    const result = allocateFifo(portions, new Decimal(150))
    expect(result).toEqual([
      { portionId: 'p1', amount: new Decimal(100) },
      { portionId: 'p2', amount: new Decimal(50) },
    ])
  })

  it('allocates exact balance across portions', () => {
    const portions = [
      { id: 'p1', remainingAmount: new Decimal(50), createdAt: new Date('2026-01-01') },
    ]
    const result = allocateFifo(portions, new Decimal(50))
    expect(result[0].amount.toString()).toBe('50')
  })

  it('throws when payment exceeds open portions', () => {
    const portions = [
      { id: 'p1', remainingAmount: new Decimal(30), createdAt: new Date('2026-01-01') },
    ]
    expect(() => allocateFifo(portions, new Decimal(50))).toThrow()
  })
})

import { describe, expect, it } from 'vitest'
import { CustomError } from '../src/shared/types/error_type.js'
import {
  assertOrderLinesEditable,
  computeOrderMoney,
  isOrderLinesEditable,
} from '../src/shared/orders/editLines.js'

describe('order line edits', () => {
  it('allows edits while the order is still being fulfilled', () => {
    expect(isOrderLinesEditable('PLACED')).toBe(true)
    expect(isOrderLinesEditable('READY_FOR_PICKUP')).toBe(true)
    expect(isOrderLinesEditable('OUT_FOR_DELIVERY')).toBe(true)
    expect(isOrderLinesEditable('COMPLETED')).toBe(false)
    expect(isOrderLinesEditable('CANCELLED')).toBe(false)
  })

  it('locks paid or cancelled orders', () => {
    expect(() => assertOrderLinesEditable('COMPLETED', false)).toThrow(CustomError)
    expect(() => assertOrderLinesEditable('PLACED', true)).toThrow(CustomError)
    expect(() => assertOrderLinesEditable('PLACED', false)).not.toThrow()
  })

  it('recomputes subtotal plus delivery fee', () => {
    const money = computeOrderMoney(
      [
        { unitPrice: '2000', quantity: 2 },
        { unitPrice: '500.5', quantity: 1 },
      ],
      '400',
    )
    expect(money.subtotal.toFixed(2)).toBe('4500.50')
    expect(money.total.toFixed(2)).toBe('4900.50')
  })
})

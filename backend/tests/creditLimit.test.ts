import { describe, it, expect } from 'vitest'
import { Decimal } from '@prisma/client/runtime/library'
import { assertCreditWithinLimit, assertPaymentWithinBalance } from '../src/shared/credit/limitCheck.js'
import { CustomError } from '../src/shared/types/error_type.js'

describe('assertCreditWithinLimit', () => {
  it('allows credit when limit is null (unlimited)', () => {
    expect(() =>
      assertCreditWithinLimit(new Decimal(500), new Decimal(200), null, false),
    ).not.toThrow()
  })

  it('blocks when projected balance exceeds limit', () => {
    expect(() =>
      assertCreditWithinLimit(new Decimal(900), new Decimal(200), new Decimal(1000), false),
    ).toThrow(CustomError)
  })

  it('allows override when manager approves', () => {
    expect(() =>
      assertCreditWithinLimit(new Decimal(900), new Decimal(200), new Decimal(1000), true),
    ).not.toThrow()
  })
})

describe('assertPaymentWithinBalance', () => {
  it('rejects payment greater than balance', () => {
    expect(() =>
      assertPaymentWithinBalance(new Decimal(100), new Decimal(150)),
    ).toThrow(CustomError)
  })

  it('accepts valid payment amount', () => {
    expect(() =>
      assertPaymentWithinBalance(new Decimal(100), new Decimal(50)),
    ).not.toThrow()
  })
})

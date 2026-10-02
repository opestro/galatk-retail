import { describe, expect, it } from 'vitest'
import { CustomError } from '../src/shared/types/error_type.js'
import {
  settleOrderPaymentAmounts,
  summarizeOrderPayment,
} from '../src/shared/orders/paymentStatus.js'

describe('settleOrderPaymentAmounts', () => {
  it('takes the full total when amountPaid is omitted', () => {
    const settled = settleOrderPaymentAmounts('2400.00', {})
    expect(settled.amountPaid.toFixed(2)).toBe('2400.00')
    expect(settled.amountOnCredit.toFixed(2)).toBe('0.00')
  })

  it('splits a partial till payment so paid + credit equals total', () => {
    const settled = settleOrderPaymentAmounts('2400', { amountPaid: '1000.5' })
    expect(settled.amountPaid.toFixed(2)).toBe('1000.50')
    expect(settled.amountOnCredit.toFixed(2)).toBe('1399.50')
    expect(settled.amountPaid.add(settled.amountOnCredit).toFixed(2)).toBe('2400.00')
  })

  it('puts the full total on credit for pay-later', () => {
    const settled = settleOrderPaymentAmounts('2400', { payLater: true, amountPaid: 999 })
    expect(settled.amountPaid.toFixed(2)).toBe('0.00')
    expect(settled.amountOnCredit.toFixed(2)).toBe('2400.00')
  })

  it('rejects an overpayment', () => {
    expect(() => settleOrderPaymentAmounts('100', { amountPaid: '100.01' })).toThrow(CustomError)
  })

  it('rounds JS number input to two decimals', () => {
    const settled = settleOrderPaymentAmounts(10, { amountPaid: 3.333 })
    expect(settled.amountPaid.toFixed(2)).toBe('3.33')
    expect(settled.amountOnCredit.toFixed(2)).toBe('6.67')
  })
})

describe('summarizeOrderPayment', () => {
  it('marks open orders as unpaid for the full total', () => {
    const summary = summarizeOrderPayment({
      status: 'PLACED',
      total: '5400',
    })
    expect(summary.paymentStatus).toBe('UNPAID')
    expect(summary.collected).toBe('0.00')
    expect(summary.remainingCredit).toBe('5400.00')
  })

  it('marks a fully collected sale as paid', () => {
    const summary = summarizeOrderPayment({
      status: 'COMPLETED',
      total: '5400',
      fulfillmentSale: { amountPaid: '5400', amountOnCredit: '0', creditPortions: [] },
    })
    expect(summary.paymentStatus).toBe('PAID')
    expect(summary.collected).toBe('5400.00')
    expect(summary.remainingCredit).toBe('0.00')
  })

  it('shows paid X and remaining Y after a partial till payment', () => {
    const summary = summarizeOrderPayment({
      status: 'COMPLETED',
      total: '5400',
      fulfillmentSale: {
        amountPaid: '2000',
        amountOnCredit: '3400',
        creditPortions: [{ remainingAmount: '3400' }],
      },
    })
    expect(summary.paymentStatus).toBe('PARTIAL')
    expect(summary.amountPaid).toBe('2000.00')
    expect(summary.collected).toBe('2000.00')
    expect(summary.remainingCredit).toBe('3400.00')
  })

  it('raises collected when later client payments reduce remaining credit', () => {
    const summary = summarizeOrderPayment({
      status: 'COMPLETED',
      total: '5400',
      fulfillmentSale: {
        amountPaid: '2000',
        amountOnCredit: '3400',
        creditPortions: [{ remainingAmount: '1400' }],
      },
    })
    expect(summary.paymentStatus).toBe('PARTIAL')
    expect(summary.collected).toBe('4000.00')
    expect(summary.remainingCredit).toBe('1400.00')
  })

  it('marks the order paid after later payments clear remaining credit', () => {
    const summary = summarizeOrderPayment({
      status: 'COMPLETED',
      total: '5400',
      fulfillmentSale: {
        amountPaid: '2000',
        amountOnCredit: '3400',
        creditPortions: [{ remainingAmount: '0' }],
      },
    })
    expect(summary.paymentStatus).toBe('PAID')
    expect(summary.collected).toBe('5400.00')
    expect(summary.remainingCredit).toBe('0.00')
  })

  it('marks pay-later with nothing collected as unpaid credit', () => {
    const summary = summarizeOrderPayment({
      status: 'COMPLETED',
      total: '5400',
      fulfillmentSale: {
        amountPaid: '0',
        amountOnCredit: '5400',
        creditPortions: [{ remainingAmount: '5400' }],
      },
    })
    expect(summary.paymentStatus).toBe('CREDIT')
    expect(summary.collected).toBe('0.00')
    expect(summary.remainingCredit).toBe('5400.00')
  })

  it('treats a completed order with no sale row as paid in full', () => {
    const summary = summarizeOrderPayment({
      status: 'COMPLETED',
      total: '2400',
    })
    expect(summary.paymentStatus).toBe('PAID')
    expect(summary.collected).toBe('2400.00')
  })

  it('hides payment on cancelled orders', () => {
    const summary = summarizeOrderPayment({
      status: 'CANCELLED',
      total: '5400',
    })
    expect(summary.paymentStatus).toBe('NONE')
    expect(summary.remainingCredit).toBe('0')
  })
})

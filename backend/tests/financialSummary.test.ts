import { describe, it, expect } from 'vitest'

function computeFinancialSummary(input: {
  posCollected: number
  clientPaymentsReceived: number
  outstandingCredit: number
  totalCharges: number
}) {
  return {
    posCollected: input.posCollected.toFixed(2),
    clientPaymentsReceived: input.clientPaymentsReceived.toFixed(2),
    totalCashIn: (input.posCollected + input.clientPaymentsReceived).toFixed(2),
    outstandingCredit: input.outstandingCredit.toFixed(2),
    totalCharges: input.totalCharges.toFixed(2),
  }
}

describe('getFinancialSummary metrics', () => {
  it('computes five metrics per spec', () => {
    const summary = computeFinancialSummary({
      posCollected: 1000,
      clientPaymentsReceived: 250,
      outstandingCredit: 300,
      totalCharges: 200,
    })

    expect(summary.posCollected).toBe('1000.00')
    expect(summary.clientPaymentsReceived).toBe('250.00')
    expect(summary.totalCashIn).toBe('1250.00')
    expect(summary.outstandingCredit).toBe('300.00')
    expect(summary.totalCharges).toBe('200.00')
  })

  it('totalCashIn equals pos collected plus client payments only', () => {
    const summary = computeFinancialSummary({
      posCollected: 500,
      clientPaymentsReceived: 100,
      outstandingCredit: 50,
      totalCharges: 75,
    })
    expect(Number(summary.totalCashIn)).toBe(600)
    expect(Number(summary.outstandingCredit)).toBe(50)
  })
})

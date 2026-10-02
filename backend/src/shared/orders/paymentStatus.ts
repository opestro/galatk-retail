import { Decimal } from '@prisma/client/runtime/library'
import { CustomError } from '../types/error_type.js'

/** How the customer has settled this online order. */
export type OrderPaymentStatus = 'UNPAID' | 'CREDIT' | 'PARTIAL' | 'PAID' | 'NONE'

export interface OrderPaymentSaleInput {
  amountPaid?: { toString(): string } | string | number | null
  amountOnCredit?: { toString(): string } | string | number | null
  creditPortions?: Array<{ remainingAmount: { toString(): string } | string | number }>
}

export interface OrderPaymentInput {
  status: string
  total: { toString(): string } | string | number
  fulfillmentSale?: OrderPaymentSaleInput | null
}

export interface OrderPaymentSummary {
  /** Cash/card taken when the order was completed (unchanged by later debt payments). */
  amountPaid: string
  /** Original amount put on the client ledger at completion. */
  amountOnCredit: string
  /** Still owed on this order after FIFO client payments. */
  remainingCredit: string
  /** Till payment plus later allocations against this order's credit. */
  collected: string
  paymentStatus: OrderPaymentStatus
}

/** Two-decimal money. Prefer strings over JS numbers to avoid binary float error. */
export function toMoney(value: { toString(): string } | string | number | null | undefined): Decimal {
  if (value === null || value === undefined || value === '') return new Decimal(0)
  const raw = typeof value === 'number' && Number.isFinite(value) ? value.toFixed(2) : value.toString()
  try {
    return new Decimal(raw).toDecimalPlaces(2)
  } catch {
    return new Decimal(0)
  }
}

function remainingFromSale(sale: OrderPaymentSaleInput): Decimal {
  if (sale.creditPortions && sale.creditPortions.length > 0) {
    return sale.creditPortions.reduce(
      (sum, portion) => sum.add(toMoney(portion.remainingAmount)),
      new Decimal(0),
    )
  }
  return toMoney(sale.amountOnCredit)
}

/**
 * Split an order total into cash collected now vs amount posted to client credit.
 * Rounds to 2 decimals so amountPaid + amountOnCredit always equals total.
 */
export function settleOrderPaymentAmounts(
  total: { toString(): string } | string | number,
  input: { amountPaid?: string | number | null; payLater?: boolean },
): { amountPaid: Decimal; amountOnCredit: Decimal } {
  const totalMoney = toMoney(total)
  if (input.payLater) {
    return { amountPaid: new Decimal(0), amountOnCredit: totalMoney }
  }

  const paid =
    input.amountPaid === undefined || input.amountPaid === null || input.amountPaid === ''
      ? totalMoney
      : toMoney(input.amountPaid)

  if (paid.lt(0) || paid.gt(totalMoney)) {
    throw new CustomError(
      'VALIDATION_ERROR',
      'amountPaid must be between 0 and the order total',
      400,
    )
  }

  return { amountPaid: paid, amountOnCredit: totalMoney.sub(paid) }
}

/**
 * Derives staff-visible payment state.
 * Open orders are UNPAID. After collection: PAID, PARTIAL (paid X, Y still on credit),
 * or CREDIT (nothing collected, full remaining on the client account).
 */
export function summarizeOrderPayment(order: OrderPaymentInput): OrderPaymentSummary {
  const total = toMoney(order.total)
  const zero = {
    amountPaid: '0',
    amountOnCredit: '0',
    remainingCredit: '0',
    collected: '0',
    paymentStatus: 'NONE' as const,
  }

  if (order.status === 'CANCELLED') {
    return zero
  }

  if (order.fulfillmentSale) {
    const sale = order.fulfillmentSale
    const originalPaid = toMoney(sale.amountPaid)
    const originalCredit = toMoney(sale.amountOnCredit)
    const remaining = Decimal.max(new Decimal(0), remainingFromSale(sale))
    const repaid = Decimal.max(new Decimal(0), originalCredit.sub(remaining))
    const collected = Decimal.min(total, Decimal.max(new Decimal(0), originalPaid.add(repaid)))

    let paymentStatus: OrderPaymentStatus
    if (remaining.lte(0)) {
      paymentStatus = 'PAID'
    } else if (collected.lte(0)) {
      paymentStatus = 'CREDIT'
    } else {
      paymentStatus = 'PARTIAL'
    }

    return {
      amountPaid: originalPaid.toFixed(2),
      amountOnCredit: originalCredit.toFixed(2),
      remainingCredit: remaining.toFixed(2),
      collected: collected.toFixed(2),
      paymentStatus,
    }
  }

  // Completed without a linked sale (legacy / failed attach): treat as settled in full.
  if (order.status === 'COMPLETED') {
    return {
      amountPaid: total.toFixed(2),
      amountOnCredit: '0.00',
      remainingCredit: '0.00',
      collected: total.toFixed(2),
      paymentStatus: 'PAID',
    }
  }

  return {
    amountPaid: '0.00',
    amountOnCredit: '0.00',
    remainingCredit: total.toFixed(2),
    collected: '0.00',
    paymentStatus: 'UNPAID',
  }
}

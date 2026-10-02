import { OrderStatus } from '@prisma/client'
import { Decimal } from '@prisma/client/runtime/library'
import { CustomError } from '../types/error_type.js'
import { toMoney } from './paymentStatus.js'

/** Open fulfillment states: staff can still change products before payment is recorded. */
export function isOrderLinesEditable(status: string): boolean {
  return (
    status === OrderStatus.PLACED ||
    status === OrderStatus.READY_FOR_PICKUP ||
    status === OrderStatus.OUT_FOR_DELIVERY
  )
}

export function assertOrderLinesEditable(status: string, hasFulfillmentSale: boolean): void {
  if (!isOrderLinesEditable(status) || hasFulfillmentSale) {
    throw new CustomError('ORDER_LOCKED', 'Cannot edit products after the order is paid or cancelled', 409)
  }
}

export function computeOrderMoney(
  lines: Array<{ unitPrice: { toString(): string } | string | number; quantity: number }>,
  deliveryFee: { toString(): string } | string | number,
): { subtotal: Decimal; total: Decimal } {
  const subtotal = lines.reduce(
    (sum, line) => sum.add(toMoney(line.unitPrice).mul(line.quantity)),
    new Decimal(0),
  )
  const total = subtotal.add(toMoney(deliveryFee))
  return { subtotal, total }
}

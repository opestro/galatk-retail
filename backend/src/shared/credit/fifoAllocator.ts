import { Decimal } from '@prisma/client/runtime/library'

export interface CreditPortion {
  id: string
  remainingAmount: Decimal
  createdAt: Date
}

export interface AllocationResult {
  portionId: string
  amount: Decimal
}

export function allocateFifo(
  portions: CreditPortion[],
  paymentAmount: Decimal,
): AllocationResult[] {
  const sorted = [...portions].sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime())
  let remaining = paymentAmount
  const allocations: AllocationResult[] = []

  for (const portion of sorted) {
    if (remaining.lte(0)) break
    if (portion.remainingAmount.lte(0)) continue

    const alloc = Decimal.min(portion.remainingAmount, remaining)
    allocations.push({ portionId: portion.id, amount: alloc })
    remaining = remaining.sub(alloc)
  }

  if (remaining.gt(0)) {
    throw new Error('Payment exceeds open credit portions')
  }

  return allocations
}

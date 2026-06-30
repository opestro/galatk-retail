import { Decimal } from '@prisma/client/runtime/library'
import { CustomError } from '../types/error_type.js'

export function assertCreditWithinLimit(
  currentBalance: Decimal,
  newCredit: Decimal,
  creditLimit: Decimal | null,
  override: boolean,
): void {
  if (newCredit.lte(0)) return

  if (creditLimit === null) return

  const projected = currentBalance.add(newCredit)
  if (projected.gt(creditLimit) && !override) {
    throw new CustomError(
      'CREDIT_LIMIT_EXCEEDED',
      `Credit limit exceeded. Limit: ${creditLimit}, projected balance: ${projected}`,
      409,
    )
  }
}

export function assertPaymentWithinBalance(balance: Decimal, amount: Decimal): void {
  if (amount.lte(0)) {
    throw new CustomError('VALIDATION_ERROR', 'Payment amount must be positive', 400)
  }
  if (amount.gt(balance)) {
    throw new CustomError('VALIDATION_ERROR', 'Payment exceeds client balance', 400)
  }
}

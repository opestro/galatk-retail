import { PaymentMethod } from '@prisma/client'

export interface RecordPaymentInput {
  amount: string | number
  paymentMethod: PaymentMethod
}

export interface CreateAdjustmentInput {
  amount: string | number
  note?: string | null
}

export interface LogReminderContactInput {
  note?: string | null
}

export interface CreditDashboardClient {
  clientId: string
  name: string
  phone: string
  email: string | null
  balance: string
  oldestDebtAgeDays: number
}

export interface CreditReminderClient extends CreditDashboardClient {
  lastContactedAt: string | null
}

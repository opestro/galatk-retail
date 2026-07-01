import prisma from '../../resources/database/initDatabase.js'
import { CustomError } from '../../shared/types/error_type.js'
import { AuthenticatedStaff, assertShopAccess, requireMinRole } from '../../shared/middlewares/shopScope.js'
import { allocateFifo } from '../../shared/credit/fifoAllocator.js'
import { assertPaymentWithinBalance } from '../../shared/credit/limitCheck.js'
import { getClientForStaff } from '../clients/service.js'
import {
  CreateAdjustmentInput,
  CreditDashboardClient,
  CreditReminderClient,
  LogReminderContactInput,
  RecordPaymentInput,
} from './types.js'
import {
  ClientLedgerEntryType,
  ClientPaymentStatus,
  PaymentMethod,
  StaffRole,
} from '@prisma/client'
import { Decimal } from '@prisma/client/runtime/library'

function daysSince(date: Date): number {
  return Math.floor((Date.now() - date.getTime()) / (1000 * 60 * 60 * 24))
}

async function getOldestOpenPortion(clientId: string) {
  return prisma.clientCreditPortion.findFirst({
    where: { clientId, remainingAmount: { gt: 0 } },
    orderBy: { createdAt: 'asc' },
  })
}

async function buildDashboardClient(client: {
  id: string
  name: string
  phone: string
  balance: Decimal
}): Promise<CreditDashboardClient> {
  const oldestPortion = await getOldestOpenPortion(client.id)
  return {
    clientId: client.id,
    name: client.name,
    phone: client.phone,
    balance: client.balance.toString(),
    oldestDebtAgeDays: oldestPortion ? daysSince(oldestPortion.createdAt) : 0,
  }
}

export async function recordPayment(
  staff: AuthenticatedStaff,
  shopId: string,
  clientId: string,
  input: RecordPaymentInput,
) {
  assertShopAccess(staff, shopId)
  const client = await getClientForStaff(staff, clientId)

  if (client.shopId !== shopId) {
    throw new CustomError('CLIENT_SHOP_MISMATCH', 'Client does not belong to this shop', 400)
  }

  const amount = new Decimal(input.amount)
  assertPaymentWithinBalance(client.balance, amount)

  if (!Object.values(PaymentMethod).includes(input.paymentMethod)) {
    throw new CustomError('VALIDATION_ERROR', 'Invalid payment method', 400)
  }

  const portions = await prisma.clientCreditPortion.findMany({
    where: { clientId, remainingAmount: { gt: 0 } },
    orderBy: { createdAt: 'asc' },
  })

  const openPortionsTotal = portions.reduce(
    (sum, portion) => sum.add(portion.remainingAmount),
    new Decimal(0),
  )

  const amountToAllocate = Decimal.min(amount, openPortionsTotal)
  const allocations =
    amountToAllocate.gt(0) ? allocateFifo(portions, amountToAllocate) : []

  return prisma.$transaction(async (tx) => {
    const payment = await tx.clientPayment.create({
      data: {
        clientId,
        shopId,
        amount,
        paymentMethod: input.paymentMethod,
        status: ClientPaymentStatus.COMPLETED,
        recordedById: staff.id,
      },
    })

    for (const alloc of allocations) {
      await tx.clientPaymentAllocation.create({
        data: {
          paymentId: payment.id,
          portionId: alloc.portionId,
          amount: alloc.amount,
        },
      })

      await tx.clientCreditPortion.update({
        where: { id: alloc.portionId },
        data: { remainingAmount: { decrement: alloc.amount } },
      })
    }

    await tx.client.update({
      where: { id: clientId },
      data: { balance: { decrement: amount } },
    })

    await tx.clientLedgerEntry.create({
      data: {
        clientId,
        type: ClientLedgerEntryType.PAYMENT,
        amount: amount.neg(),
        paymentId: payment.id,
        recordedById: staff.id,
      },
    })

    return tx.clientPayment.findUnique({
      where: { id: payment.id },
      include: {
        allocations: { include: { portion: true } },
        recordedBy: { select: { id: true, name: true } },
      },
    })
  })
}

export async function voidPayment(
  staff: AuthenticatedStaff,
  shopId: string,
  clientId: string,
  paymentId: string,
  reason?: string,
) {
  assertShopAccess(staff, shopId)
  requireMinRole(staff, StaffRole.MANAGER)
  await getClientForStaff(staff, clientId)

  const payment = await prisma.clientPayment.findFirst({
    where: { id: paymentId, clientId, shopId },
    include: { allocations: true },
  })

  if (!payment) {
    throw new CustomError('PAYMENT_NOT_FOUND', 'Payment not found', 404)
  }

  if (payment.status === ClientPaymentStatus.CANCELLED) {
    throw new CustomError('ALREADY_VOIDED', 'Payment is already voided', 400)
  }

  return prisma.$transaction(async (tx) => {
    for (const alloc of payment.allocations) {
      await tx.clientCreditPortion.update({
        where: { id: alloc.portionId },
        data: { remainingAmount: { increment: alloc.amount } },
      })
    }

    await tx.client.update({
      where: { id: clientId },
      data: { balance: { increment: payment.amount } },
    })

    await tx.clientLedgerEntry.create({
      data: {
        clientId,
        type: ClientLedgerEntryType.PAYMENT_VOID,
        amount: payment.amount,
        paymentId: payment.id,
        recordedById: staff.id,
        note: reason ?? null,
      },
    })

    return tx.clientPayment.update({
      where: { id: paymentId },
      data: {
        status: ClientPaymentStatus.CANCELLED,
        cancelledById: staff.id,
        cancelledAt: new Date(),
        cancelReason: reason ?? null,
      },
      include: {
        allocations: true,
        recordedBy: { select: { id: true, name: true } },
        cancelledBy: { select: { id: true, name: true } },
      },
    })
  })
}

export async function getCreditDashboard(staff: AuthenticatedStaff, shopId: string) {
  assertShopAccess(staff, shopId)

  const clients = await prisma.client.findMany({
    where: { shopId, balance: { gt: 0 } },
    orderBy: { name: 'asc' },
  })

  return Promise.all(clients.map(buildDashboardClient))
}

export async function getCreditReminders(staff: AuthenticatedStaff, shopId: string) {
  assertShopAccess(staff, shopId)
  requireMinRole(staff, StaffRole.MANAGER)

  const shop = await prisma.shop.findUnique({ where: { id: shopId } })
  if (!shop) {
    throw new CustomError('SHOP_NOT_FOUND', 'Shop not found', 404)
  }

  const clients = await prisma.client.findMany({
    where: { shopId, balance: { gt: 0 } },
    include: {
      reminderContacts: { orderBy: { contactedAt: 'desc' }, take: 1 },
    },
  })

  const results: CreditReminderClient[] = []

  for (const client of clients) {
    const dashboard = await buildDashboardClient(client)
    if (dashboard.oldestDebtAgeDays > shop.creditReminderDays) {
      results.push({
        ...dashboard,
        lastContactedAt: client.reminderContacts[0]?.contactedAt.toISOString() ?? null,
      })
    }
  }

  return results.sort((a, b) => b.oldestDebtAgeDays - a.oldestDebtAgeDays)
}

export async function logReminderContact(
  staff: AuthenticatedStaff,
  clientId: string,
  input: LogReminderContactInput,
) {
  requireMinRole(staff, StaffRole.MANAGER)
  await getClientForStaff(staff, clientId)

  return prisma.creditReminderContact.create({
    data: {
      clientId,
      contactedById: staff.id,
      note: input.note?.trim() ?? null,
    },
    include: { contactedBy: { select: { id: true, name: true } } },
  })
}

export async function createAdjustment(
  staff: AuthenticatedStaff,
  clientId: string,
  input: CreateAdjustmentInput,
) {
  requireMinRole(staff, StaffRole.MANAGER)
  const client = await getClientForStaff(staff, clientId)

  const amount = new Decimal(input.amount)
  if (amount.isZero()) {
    throw new CustomError('VALIDATION_ERROR', 'Adjustment amount cannot be zero', 400)
  }

  const projectedBalance = client.balance.add(amount)
  if (projectedBalance.lt(0)) {
    throw new CustomError('VALIDATION_ERROR', 'Adjustment would result in negative balance', 400)
  }

  return prisma.$transaction(async (tx) => {
    await tx.client.update({
      where: { id: clientId },
      data: { balance: { increment: amount } },
    })

    if (amount.gt(0)) {
      await tx.clientCreditPortion.create({
        data: {
          clientId,
          originalAmount: amount,
          remainingAmount: amount,
        },
      })
    }

    await tx.clientLedgerEntry.create({
      data: {
        clientId,
        type: ClientLedgerEntryType.ADJUSTMENT,
        amount,
        recordedById: staff.id,
        note: input.note?.trim() ?? null,
      },
    })

    return tx.client.findUnique({ where: { id: clientId } })
  })
}

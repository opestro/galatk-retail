import prisma from '../../resources/database/initDatabase.js'
import { CustomError } from '../../shared/types/error_type.js'
import { AuthenticatedStaff, assertShopAccess, requireMinRole } from '../../shared/middlewares/shopScope.js'
import { isValidChargeCategory } from '../../shared/charges/categories.js'
import { CreateChargeInput } from './types.js'
import { ShopChargeStatus, StaffRole } from '@prisma/client'
import { Decimal } from '@prisma/client/runtime/library'

function parseDateRange(from?: string, to?: string) {
  const fromDate = from ? new Date(from) : undefined
  const toDate = to ? new Date(to) : undefined

  if (toDate) {
    toDate.setUTCHours(23, 59, 59, 999)
  }

  return { fromDate, toDate }
}

export async function listCharges(
  staff: AuthenticatedStaff,
  shopId: string,
  from?: string,
  to?: string,
) {
  assertShopAccess(staff, shopId)
  requireMinRole(staff, StaffRole.MANAGER)

  const { fromDate, toDate } = parseDateRange(from, to)
  const where: {
    shopId: string
    chargeDate?: { gte?: Date; lte?: Date }
  } = { shopId }

  if (fromDate || toDate) {
    where.chargeDate = {}
    if (fromDate) where.chargeDate.gte = fromDate
    if (toDate) where.chargeDate.lte = toDate
  }

  return prisma.shopCharge.findMany({
    where,
    include: {
      recordedBy: { select: { id: true, name: true } },
      cancelledBy: { select: { id: true, name: true } },
    },
    orderBy: { chargeDate: 'desc' },
  })
}

export async function createCharge(
  staff: AuthenticatedStaff,
  shopId: string,
  input: CreateChargeInput,
) {
  assertShopAccess(staff, shopId)
  requireMinRole(staff, StaffRole.MANAGER)

  if (!isValidChargeCategory(input.category)) {
    throw new CustomError('VALIDATION_ERROR', 'Invalid charge category', 400)
  }

  const amount = new Decimal(input.amount)
  if (amount.lte(0)) {
    throw new CustomError('VALIDATION_ERROR', 'Charge amount must be positive', 400)
  }

  if (!input.chargeDate) {
    throw new CustomError('VALIDATION_ERROR', 'Charge date is required', 400)
  }

  return prisma.shopCharge.create({
    data: {
      shopId,
      category: input.category,
      amount,
      chargeDate: new Date(input.chargeDate),
      note: input.note?.trim() ?? null,
      status: ShopChargeStatus.ACTIVE,
      recordedById: staff.id,
    },
    include: { recordedBy: { select: { id: true, name: true } } },
  })
}

export async function voidCharge(
  staff: AuthenticatedStaff,
  shopId: string,
  chargeId: string,
  reason?: string,
) {
  assertShopAccess(staff, shopId)
  requireMinRole(staff, StaffRole.MANAGER)

  const charge = await prisma.shopCharge.findFirst({
    where: { id: chargeId, shopId },
  })

  if (!charge) {
    throw new CustomError('CHARGE_NOT_FOUND', 'Charge not found', 404)
  }

  if (charge.status === ShopChargeStatus.CANCELLED) {
    throw new CustomError('ALREADY_VOIDED', 'Charge is already voided', 400)
  }

  return prisma.shopCharge.update({
    where: { id: chargeId },
    data: {
      status: ShopChargeStatus.CANCELLED,
      cancelledById: staff.id,
      cancelledAt: new Date(),
      cancelReason: reason ?? null,
    },
    include: {
      recordedBy: { select: { id: true, name: true } },
      cancelledBy: { select: { id: true, name: true } },
    },
  })
}

import prisma from '../../resources/database/initDatabase.js'
import { CustomError } from '../../shared/types/error_type.js'
import { AuthenticatedStaff, assertShopAccess, requireMinRole } from '../../shared/middlewares/shopScope.js'
import { decrementShopStock, restoreShopStock } from '../../shared/stock/stockMutations.js'
import { assertCanVoidSale } from '../../shared/pos/voidRules.js'
import { assertCreditWithinLimit } from '../../shared/credit/limitCheck.js'
import { ClientLedgerEntryType, PaymentMethod, SaleStatus, StaffRole } from '@prisma/client'
import { Decimal } from '@prisma/client/runtime/library'

export interface SaleLineInput {
  productId: string
  quantity: number
}

export interface CreateSaleInput {
  lines: SaleLineInput[]
  paymentMethod: PaymentMethod
  clientId?: string | null
  amountPaid?: string | number
  payLater?: boolean
  creditLimitOverride?: boolean
}

export async function listPosProducts(staff: AuthenticatedStaff, shopId: string) {
  assertShopAccess(staff, shopId)

  const stock = await prisma.shopStock.findMany({
    where: { shopId, quantity: { gt: 0 }, product: { isActive: true } },
    include: { product: true },
  })

  return stock.map((s) => ({
    productId: s.productId,
    name: s.product.name,
    sellPrice: s.product.sellPrice.toString(),
    quantity: s.quantity,
  }))
}

export async function createSale(staff: AuthenticatedStaff, shopId: string, input: CreateSaleInput) {
  assertShopAccess(staff, shopId)

  if (!input.lines?.length) {
    throw new CustomError('VALIDATION_ERROR', 'At least one line is required', 400)
  }

  const products = await Promise.all(
    input.lines.map(async (line) => {
      const product = await prisma.product.findUnique({ where: { id: line.productId } })
      if (!product || !product.isActive) {
        throw new CustomError('PRODUCT_NOT_FOUND', `Product ${line.productId} not found`, 404)
      }
      if (line.quantity <= 0) {
        throw new CustomError('VALIDATION_ERROR', 'Quantity must be positive', 400)
      }
      return { product, quantity: line.quantity }
    }),
  )

  const total = products.reduce(
    (sum, { product, quantity }) => sum.add(product.sellPrice.mul(quantity)),
    new Decimal(0),
  )

  let amountPaid: Decimal
  let amountOnCredit: Decimal
  let clientId: string | null = null
  let creditApprovedById: string | null = null

  if (input.payLater) {
    requireMinRole(staff, StaffRole.MANAGER)
    if (!input.clientId) {
      throw new CustomError('VALIDATION_ERROR', 'Client is required for pay-later sales', 400)
    }
    amountPaid = new Decimal(0)
    amountOnCredit = total
    clientId = input.clientId
    creditApprovedById = staff.id
  } else if (input.clientId) {
    clientId = input.clientId
    amountPaid =
      input.amountPaid !== undefined ? new Decimal(input.amountPaid) : total
    amountOnCredit = total.sub(amountPaid)

    if (amountOnCredit.lte(0) && !amountPaid.equals(total)) {
      throw new CustomError(
        'VALIDATION_ERROR',
        'Partial payment requires amountPaid less than total',
        400,
      )
    }
  } else {
    amountPaid = input.amountPaid !== undefined ? new Decimal(input.amountPaid) : total
    amountOnCredit = new Decimal(0)

    if (!amountPaid.equals(total)) {
      throw new CustomError(
        'VALIDATION_ERROR',
        'Guest checkout requires amountPaid to equal total',
        400,
      )
    }
  }

  if (!amountPaid.add(amountOnCredit).equals(total)) {
    throw new CustomError(
      'VALIDATION_ERROR',
      'amountPaid plus amountOnCredit must equal total',
      400,
    )
  }

  let clientRecord: Awaited<ReturnType<typeof prisma.client.findFirst>> = null

  if (amountOnCredit.gt(0)) {
    if (!clientId) {
      throw new CustomError('VALIDATION_ERROR', 'Client is required when putting amount on credit', 400)
    }

    clientRecord = await prisma.client.findFirst({
      where: { id: clientId, shopId, isActive: true },
    })

    if (!clientRecord) {
      throw new CustomError('CLIENT_NOT_FOUND', 'Active client not found for this shop', 404)
    }

    const override = input.creditLimitOverride ?? false
    if (override) {
      requireMinRole(staff, StaffRole.MANAGER)
      creditApprovedById = staff.id
    }

    assertCreditWithinLimit(
      clientRecord.balance,
      amountOnCredit,
      clientRecord.creditLimit,
      override,
    )
  }

  return prisma.$transaction(async (tx) => {
    await decrementShopStock(
      tx,
      shopId,
      input.lines.map((l) => ({ productId: l.productId, quantity: l.quantity })),
    )

    const sale = await tx.sale.create({
      data: {
        shopId,
        cashierId: staff.id,
        paymentMethod: input.paymentMethod,
        subtotal: total,
        total,
        amountPaid,
        amountOnCredit,
        clientId,
        creditApprovedById,
        lines: {
          create: products.map(({ product, quantity }) => ({
            productId: product.id,
            quantity,
            unitPrice: product.sellPrice,
            lineTotal: product.sellPrice.mul(quantity),
          })),
        },
      },
      include: {
        lines: { include: { product: true } },
        cashier: { select: { id: true, name: true } },
        client: { select: { id: true, name: true, phone: true } },
      },
    })

    if (amountOnCredit.gt(0) && clientId) {
      await tx.clientCreditPortion.create({
        data: {
          clientId,
          saleId: sale.id,
          originalAmount: amountOnCredit,
          remainingAmount: amountOnCredit,
        },
      })

      await tx.client.update({
        where: { id: clientId },
        data: { balance: { increment: amountOnCredit } },
      })

      await tx.clientLedgerEntry.create({
        data: {
          clientId,
          type: ClientLedgerEntryType.SALE_CREDIT,
          amount: amountOnCredit,
          saleId: sale.id,
          recordedById: staff.id,
        },
      })
    }

    return sale
  })
}

export async function listSales(staff: AuthenticatedStaff, shopId: string, date?: string) {
  assertShopAccess(staff, shopId)

  const where: { shopId: string; createdAt?: { gte: Date; lt: Date } } = { shopId }

  if (date) {
    const start = new Date(date)
    const end = new Date(date)
    end.setUTCDate(end.getUTCDate() + 1)
    where.createdAt = { gte: start, lt: end }
  }

  return prisma.sale.findMany({
    where,
    include: {
      lines: { include: { product: true } },
      cashier: { select: { id: true, name: true } },
      cancelledBy: { select: { id: true, name: true } },
      client: { select: { id: true, name: true } },
    },
    orderBy: { createdAt: 'desc' },
    take: 100,
  })
}

export async function getSaleById(staff: AuthenticatedStaff, shopId: string, saleId: string) {
  assertShopAccess(staff, shopId)

  const sale = await prisma.sale.findFirst({
    where: { id: saleId, shopId },
    include: {
      lines: { include: { product: true } },
      cashier: { select: { id: true, name: true } },
      cancelledBy: { select: { id: true, name: true } },
      client: { select: { id: true, name: true } },
    },
  })

  if (!sale) {
    throw new CustomError('SALE_NOT_FOUND', 'Sale not found', 404)
  }

  return sale
}

export async function voidSale(
  staff: AuthenticatedStaff,
  shopId: string,
  saleId: string,
  reason?: string,
) {
  assertShopAccess(staff, shopId)

  const sale = await prisma.sale.findFirst({
    where: { id: saleId, shopId },
    include: {
      lines: true,
      creditPortions: { include: { allocations: true } },
    },
  })

  if (!sale) {
    throw new CustomError('SALE_NOT_FOUND', 'Sale not found', 404)
  }

  assertCanVoidSale(staff.role, staff.id, sale)

  for (const portion of sale.creditPortions) {
    if (portion.allocations.length > 0) {
      throw new CustomError(
        'SALE_VOID_BLOCKED',
        'Cannot void sale with allocated credit payments; void payments first',
        422,
      )
    }
  }

  return prisma.$transaction(async (tx) => {
    if (!sale.onlineOrderId) {
      await restoreShopStock(
        tx,
        shopId,
        sale.lines.map((l) => ({ productId: l.productId, quantity: l.quantity })),
      )
    }

    if (sale.amountOnCredit.gt(0) && sale.clientId) {
      const reverseAmount = sale.creditPortions.reduce(
        (sum, p) => sum.add(p.remainingAmount),
        new Decimal(0),
      )

      if (reverseAmount.gt(0)) {
        for (const portion of sale.creditPortions) {
          await tx.clientCreditPortion.update({
            where: { id: portion.id },
            data: { remainingAmount: new Decimal(0) },
          })
        }

        await tx.client.update({
          where: { id: sale.clientId },
          data: { balance: { decrement: reverseAmount } },
        })

        await tx.clientLedgerEntry.create({
          data: {
            clientId: sale.clientId,
            type: ClientLedgerEntryType.SALE_VOID_REVERSAL,
            amount: reverseAmount.neg(),
            saleId: sale.id,
            recordedById: staff.id,
            note: reason ?? null,
          },
        })
      }
    }

    return tx.sale.update({
      where: { id: saleId },
      data: {
        status: SaleStatus.CANCELLED,
        cancelledById: staff.id,
        cancelledAt: new Date(),
        cancelReason: reason ?? null,
      },
      include: {
        lines: { include: { product: true } },
        cashier: { select: { id: true, name: true } },
        cancelledBy: { select: { id: true, name: true } },
        client: { select: { id: true, name: true } },
      },
    })
  })
}

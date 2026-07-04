import { Prisma } from '@prisma/client'
import prisma from '../../resources/database/initDatabase.js'
import { incrementShopStock } from '../../shared/stock/stockMutations.js'
import { CustomError } from '../../shared/types/error_type.js'
import { CreateIntegrationInboundInput, IntegrationShopSummary } from './types.js'

function integrationStaffId(): string {
  const staffId = process.env.GALATK_INTEGRATION_STAFF_ID
  if (!staffId) {
    throw new CustomError(
      'INTEGRATION_DISABLED',
      'GALATK_INTEGRATION_STAFF_ID is not configured',
      503,
    )
  }
  return staffId
}

export async function listIntegrationShops(): Promise<IntegrationShopSummary[]> {
  const shops = await prisma.shop.findMany({
    orderBy: { name: 'asc' },
    select: { id: true, name: true, slug: true, address: true },
  })
  return shops
}

async function resolveOrCreateProduct(
  tx: Prisma.TransactionClient,
  line: CreateIntegrationInboundInput['lines'][number],
) {
  const unitCost = line.unitCost
  const sellPrice = line.sellPrice ?? line.unitCost

  const existing = await tx.product.findFirst({
    where: { galatkProductRef: line.galatkProductRef },
  })
  if (existing) {
    return tx.product.update({
      where: { id: existing.id },
      data: {
        name: line.name,
        unitCost,
      },
    })
  }

  return tx.product.create({
    data: {
      name: line.name,
      unitCost,
      sellPrice,
      galatkProductRef: line.galatkProductRef,
      isActive: true,
      availableOnline: true,
    },
  })
}

export async function createIntegrationInboundTransfer(
  shopId: string,
  input: CreateIntegrationInboundInput,
) {
  if (!input.galatkTransferRef?.trim()) {
    throw new CustomError('VALIDATION_ERROR', 'galatkTransferRef is required', 400)
  }

  if (!input.lines?.length) {
    throw new CustomError('VALIDATION_ERROR', 'At least one line is required', 400)
  }

  for (const line of input.lines) {
    if (!line.galatkProductRef?.trim() || !line.name?.trim()) {
      throw new CustomError(
        'VALIDATION_ERROR',
        'Each line needs galatkProductRef and name',
        400,
      )
    }
    if (!line.unitCost?.trim()) {
      throw new CustomError('VALIDATION_ERROR', 'Each line needs unitCost', 400)
    }
    if (line.quantity <= 0 || !Number.isFinite(line.quantity)) {
      throw new CustomError('VALIDATION_ERROR', 'Each line needs a positive quantity', 400)
    }
  }

  const existing = await prisma.inboundTransfer.findFirst({
    where: { galatkTransferRef: input.galatkTransferRef },
    include: { lines: { include: { product: true } } },
  })
  if (existing) {
    return { transfer: existing, created: false }
  }

  const shop = await prisma.shop.findUnique({ where: { id: shopId } })
  if (!shop) {
    throw new CustomError('SHOP_NOT_FOUND', 'Shop not found', 404)
  }

  const staffId = integrationStaffId()
  const staff = await prisma.staffUser.findUnique({ where: { id: staffId } })
  if (!staff) {
    throw new CustomError(
      'INTEGRATION_DISABLED',
      'Integration staff user not found',
      503,
    )
  }

  return prisma.$transaction(async (tx) => {
    const resolvedLines: Array<{ productId: string; quantity: number }> = []

    for (const line of input.lines) {
      const product = await resolveOrCreateProduct(tx, line)
      resolvedLines.push({ productId: product.id, quantity: line.quantity })
    }

    const transfer = await tx.inboundTransfer.create({
      data: {
        shopId,
        recordedById: staffId,
        galatkTransferRef: input.galatkTransferRef,
        note: input.note ?? null,
        lines: {
          create: resolvedLines.map((l) => ({
            productId: l.productId,
            quantity: l.quantity,
          })),
        },
      },
      include: { lines: { include: { product: true } } },
    })

    await incrementShopStock(tx, shopId, resolvedLines)
    return { transfer, created: true }
  })
}

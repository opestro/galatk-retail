import prisma from '../../resources/database/initDatabase.js'
import { CustomError } from '../../shared/types/error_type.js'
import { AuthenticatedStaff, assertShopAccess, requireMinRole } from '../../shared/middlewares/shopScope.js'
import { incrementShopStock } from '../../shared/stock/stockMutations.js'
import { StaffRole } from '@prisma/client'

export interface InboundTransferLineInput {
  productId: string
  quantity: number
}

export interface CreateInboundTransferInput {
  lines: InboundTransferLineInput[]
  galatkTransferRef?: string
  note?: string
}

export async function listShopStock(staff: AuthenticatedStaff, shopId: string) {
  assertShopAccess(staff, shopId)
  requireMinRole(staff, StaffRole.MANAGER)

  return prisma.shopStock.findMany({
    where: { shopId },
    include: { product: true },
    orderBy: { product: { name: 'asc' } },
  })
}

export async function createInboundTransfer(
  staff: AuthenticatedStaff,
  shopId: string,
  input: CreateInboundTransferInput,
) {
  assertShopAccess(staff, shopId)
  requireMinRole(staff, StaffRole.MANAGER)

  if (!input.lines?.length) {
    throw new CustomError('VALIDATION_ERROR', 'At least one line is required', 400)
  }

  for (const line of input.lines) {
    if (!line.productId || line.quantity <= 0) {
      throw new CustomError('VALIDATION_ERROR', 'Each line needs productId and positive quantity', 400)
    }
    await prisma.product.findUniqueOrThrow({ where: { id: line.productId } })
  }

  return prisma.$transaction(async (tx) => {
    const transfer = await tx.inboundTransfer.create({
      data: {
        shopId,
        recordedById: staff.id,
        galatkTransferRef: input.galatkTransferRef ?? null,
        note: input.note ?? null,
        lines: {
          create: input.lines.map((l) => ({
            productId: l.productId,
            quantity: l.quantity,
          })),
        },
      },
      include: { lines: { include: { product: true } } },
    })

    await incrementShopStock(tx, shopId, input.lines)
    return transfer
  })
}

export async function listInboundTransfers(staff: AuthenticatedStaff, shopId: string) {
  assertShopAccess(staff, shopId)
  requireMinRole(staff, StaffRole.MANAGER)

  return prisma.inboundTransfer.findMany({
    where: { shopId },
    include: {
      lines: { include: { product: true } },
      recordedBy: { select: { id: true, name: true } },
    },
    orderBy: { createdAt: 'desc' },
  })
}

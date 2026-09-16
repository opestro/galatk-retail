import { Prisma } from '@prisma/client'
import prisma from '../../resources/database/initDatabase.js'
import { incrementShopStock } from '../../shared/stock/stockMutations.js'
import { CustomError } from '../../shared/types/error_type.js'
import {
  CreateIntegrationInboundInput,
  IntegrationShopSummary,
  UpsertIntegrationProductInput,
} from './types.js'
import { parseProductFamily } from '../../shared/products/productFamily.js'
import { findOrCreateProductFamily } from '../../shared/products/findOrCreateFamily.js'
import {
  attributesKey,
  canonicalizeAttributes,
  parseAttributesFromLabel,
} from '../../shared/products/variantAttributes.js'

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

type ProductDb = Prisma.TransactionClient | typeof prisma

/**
 * Upsert a retail catalog product keyed by the Galatk workshop product id.
 * Existing rows keep their shop sellPrice; new rows default sellPrice to unitCost.
 */
export async function upsertIntegrationProduct(
  input: UpsertIntegrationProductInput,
  db: ProductDb = prisma,
) {
  const galatkProductRef = input.galatkProductRef?.trim()
  const name = input.name?.trim()
  const unitCost = input.unitCost?.trim()

  if (!galatkProductRef || !name) {
    throw new CustomError('VALIDATION_ERROR', 'galatkProductRef and name are required', 400)
  }
  if (!unitCost) {
    throw new CustomError('VALIDATION_ERROR', 'unitCost is required', 400)
  }

  const sellPrice = input.sellPrice?.trim() || unitCost

  const existing = await db.product.findFirst({
    where: { galatkProductRef },
  })

  // Prefer explicit workshop family; otherwise keep the existing retail family on update
  // so "T-shirt XL" / "T-shirt noir L" stay under "T-shirt" when category is omitted.
  const family = parseProductFamily(name, input.category ?? existing?.category)
  const catalog = await findOrCreateProductFamily(db, family.category, {
    categoryHint: family.category,
  })
  const attributes = canonicalizeAttributes(parseAttributesFromLabel(family.variantLabel))
  const key = attributesKey(attributes)

  if (existing) {
    return db.product.update({
      where: { id: existing.id },
      data: {
        name,
        unitCost,
        category: catalog.name,
        variantLabel: family.variantLabel,
        familyId: catalog.id,
        attributes,
        attributesKey: key,
      },
    })
  }

  const duplicate = await db.product.findFirst({
    where: { familyId: catalog.id, attributesKey: key },
  })
  if (duplicate) {
    return db.product.update({
      where: { id: duplicate.id },
      data: {
        name,
        unitCost,
        galatkProductRef,
        category: catalog.name,
        variantLabel: family.variantLabel,
        familyId: catalog.id,
        attributes,
        attributesKey: key,
      },
    })
  }

  return db.product.create({
    data: {
      name,
      unitCost,
      sellPrice,
      galatkProductRef,
      category: catalog.name,
      variantLabel: family.variantLabel,
      familyId: catalog.id,
      attributes,
      attributesKey: key,
      isActive: true,
      availableOnline: true,
    },
  })
}

async function resolveOrCreateProduct(
  tx: Prisma.TransactionClient,
  line: CreateIntegrationInboundInput['lines'][number],
) {
  return upsertIntegrationProduct(
    {
      galatkProductRef: line.galatkProductRef,
      name: line.name,
      unitCost: line.unitCost,
      sellPrice: line.sellPrice,
      category: line.category,
    },
    tx,
  )
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

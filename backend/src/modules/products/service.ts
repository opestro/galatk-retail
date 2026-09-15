import { Prisma } from '@prisma/client'
import prisma from '../../resources/database/initDatabase.js'
import { CustomError } from '../../shared/types/error_type.js'
import { incrementShopStock, setShopStockQuantity } from '../../shared/stock/stockMutations.js'
import { findOrCreateProductFamily } from '../../shared/products/findOrCreateFamily.js'
import { parseProductFamily } from '../../shared/products/productFamily.js'
import {
  attributesFromUnknown,
  attributesKey,
  canonicalizeAttributes,
  formatVariantLabel,
  parseAttributesFromLabel,
  skuName,
} from '../../shared/products/variantAttributes.js'
import { deleteStoredImage, persistImageBuffer, assertImageFile } from '../../resources/storage/productImages.js'
import { isUniqueConstraint, isForeignKeyConstraint } from './presenter.js'
import {
  CreateFamilyInput,
  CreateProductInput,
  UpdateFamilyInput,
  UpdateProductInput,
  UpsertVariantInput,
} from './types.js'

type Db = Prisma.TransactionClient | typeof prisma

function parseMoney(value: unknown, field: string, required = false): number | undefined {
  if (value === undefined || value === null || value === '') {
    if (required) {
      throw new CustomError('VALIDATION_ERROR', `${field} is required`, 400)
    }
    return undefined
  }
  const parsed = Number(value)
  if (!Number.isFinite(parsed) || parsed < 0) {
    throw new CustomError('VALIDATION_ERROR', `${field} must be a valid non-negative number`, 400)
  }
  return parsed
}

function parseQuantity(value: unknown): number {
  if (value === undefined || value === null || value === '') {
    return 0
  }
  const parsed = Number(value)
  if (!Number.isInteger(parsed) || parsed < 0) {
    throw new CustomError('VALIDATION_ERROR', 'Quantity must be an integer of 0 or more', 400)
  }
  return parsed
}

function familyInclude() {
  return {
    images: { orderBy: { sortOrder: 'asc' as const } },
    products: { orderBy: { name: 'asc' as const } },
  }
}

function matchesQuery(q: string, familyName: string, product: { name: string; variantLabel: string | null; galatkProductRef: string | null; attributes: unknown }) {
  const needle = q.toLowerCase()
  const attrs = attributesFromUnknown(product.attributes)
  const attrBlob = Object.values(attrs).join(' ').toLowerCase()
  return (
    familyName.toLowerCase().includes(needle) ||
    product.name.toLowerCase().includes(needle) ||
    (product.variantLabel ?? '').toLowerCase().includes(needle) ||
    (product.galatkProductRef ?? '').toLowerCase().includes(needle) ||
    attrBlob.includes(needle)
  )
}

export async function listProducts(query?: string) {
  const where = query
    ? {
        OR: [
          { name: { contains: query, mode: 'insensitive' as const } },
          { variantLabel: { contains: query, mode: 'insensitive' as const } },
          { galatkProductRef: { contains: query, mode: 'insensitive' as const } },
          { family: { name: { contains: query, mode: 'insensitive' as const } } },
        ],
      }
    : {}

  return prisma.product.findMany({
    where,
    include: { family: true },
    orderBy: { name: 'asc' },
  })
}

export async function listFamilies(query?: string) {
  const families = await prisma.productFamily.findMany({
    include: familyInclude(),
    orderBy: { name: 'asc' },
  })

  if (!query?.trim()) {
    return families
  }

  const q = query.trim()
  return families
    .map((family) => ({
      ...family,
      products: family.products.filter((product) => matchesQuery(q, family.name, product)),
    }))
    .filter((family) => family.products.length > 0 || family.name.toLowerCase().includes(q.toLowerCase()))
}

export async function getFamilyById(familyId: string) {
  const family = await prisma.productFamily.findUnique({
    where: { id: familyId },
    include: familyInclude(),
  })
  if (!family) {
    throw new CustomError('PRODUCT_NOT_FOUND', 'Product not found', 404)
  }
  return family
}

export async function stockMapForShop(shopId: string | undefined, productIds: string[]) {
  const map = new Map<string, number>()
  if (!shopId || productIds.length === 0) {
    return map
  }
  const rows = await prisma.shopStock.findMany({
    where: { shopId, productId: { in: productIds } },
  })
  for (const row of rows) {
    map.set(row.productId, row.quantity)
  }
  return map
}

async function inboundQuantity(db: Prisma.TransactionClient, shopId: string | undefined, productId: string, quantity: number) {
  if (!shopId || quantity <= 0) {
    return
  }
  await incrementShopStock(db, shopId, [{ productId, quantity }])
}

async function findSkuByAttributes(db: Db, familyId: string, key: string) {
  return db.product.findFirst({
    where: { familyId, attributesKey: key },
  })
}

async function createSkuRow(
  db: Db,
  input: {
    familyId: string
    familyName: string
    attributes: Record<string, string>
    key: string
    unitCost: number
    sellPrice: number
    description?: string | null
    galatkProductRef?: string | null
    isActive: boolean
    availableOnline: boolean
  },
) {
  const variantLabel = formatVariantLabel(input.attributes)
  const parsed = parseProductFamily(input.familyName)
  return db.product.create({
    data: {
      name: skuName(input.familyName, input.attributes),
      description: input.description ?? null,
      unitCost: input.unitCost,
      sellPrice: input.sellPrice,
      galatkProductRef: input.galatkProductRef ?? null,
      category: parsed.category,
      variantLabel,
      familyId: input.familyId,
      attributes: input.attributes,
      attributesKey: input.key,
      isActive: input.isActive,
      availableOnline: input.availableOnline,
    },
  })
}

/**
 * Create or reuse a SKU inside a family. Duplicate attribute combinations update
 * price/cost and inbound the requested quantity instead of inserting a second row.
 */
export async function upsertFamilyVariant(
  familyId: string,
  input: UpsertVariantInput,
  options?: { description?: string | null; galatkProductRef?: string | null },
) {
  const family = await getFamilyById(familyId)
  const attributes = canonicalizeAttributes(input.attributes ?? {})
  const key = attributesKey(attributes)
  const unitCost = parseMoney(input.unitCost, 'unitCost') ?? 0
  const sellPrice = parseMoney(input.sellPrice, 'sellPrice', input.sellPrice !== undefined)
  const quantity = parseQuantity(input.quantity)
  const shopId = input.shopId?.trim() || undefined

  if (quantity > 0 && !shopId) {
    throw new CustomError('VALIDATION_ERROR', 'shopId is required when adding quantity', 400)
  }

  try {
    return await prisma.$transaction(async (tx) => {
      const existing = await findSkuByAttributes(tx, family.id, key)
      if (existing) {
        const updated = await tx.product.update({
          where: { id: existing.id },
          data: {
            unitCost: input.unitCost !== undefined ? unitCost : undefined,
            sellPrice: sellPrice !== undefined ? sellPrice : undefined,
            isActive: input.isActive ?? existing.isActive,
            availableOnline: input.availableOnline ?? existing.availableOnline,
            attributes,
            attributesKey: key,
            variantLabel: formatVariantLabel(attributes),
            name: skuName(family.name, attributes),
            category: family.name,
          },
        })
        await inboundQuantity(tx, shopId, updated.id, quantity)
        return { product: updated, created: false }
      }

      if (sellPrice === undefined) {
        throw new CustomError('VALIDATION_ERROR', 'sellPrice is required', 400)
      }

      const created = await createSkuRow(tx, {
        familyId: family.id,
        familyName: family.name,
        attributes,
        key,
        unitCost,
        sellPrice,
        description: options?.description ?? family.description,
        galatkProductRef: options?.galatkProductRef,
        isActive: input.isActive ?? true,
        availableOnline: input.availableOnline ?? true,
      })
      await inboundQuantity(tx, shopId, created.id, quantity)
      return { product: created, created: true }
    })
  } catch (error) {
    if (isUniqueConstraint(error)) {
      return prisma.$transaction(async (tx) => {
        const existing = await findSkuByAttributes(tx, family.id, key)
        if (!existing) {
          throw error
        }
        const updated = await tx.product.update({
          where: { id: existing.id },
          data: {
            unitCost: input.unitCost !== undefined ? unitCost : undefined,
            sellPrice: sellPrice !== undefined ? sellPrice : undefined,
            isActive: input.isActive ?? existing.isActive,
            availableOnline: input.availableOnline ?? existing.availableOnline,
            attributes,
            attributesKey: key,
            variantLabel: formatVariantLabel(attributes),
            name: skuName(family.name, attributes),
            category: family.name,
          },
        })
        await inboundQuantity(tx, shopId, updated.id, quantity)
        return { product: updated, created: false }
      })
    }
    throw error
  }
}

export async function createFamily(input: CreateFamilyInput) {
  const name = input.name?.trim()
  if (!name) {
    throw new CustomError('VALIDATION_ERROR', 'Product name is required', 400)
  }

  const variants = input.variants ?? []
  const shopId = input.shopId?.trim() || undefined
  if (variants.some((v) => parseQuantity(v.quantity) > 0) && !shopId) {
    throw new CustomError('VALIDATION_ERROR', 'shopId is required when adding quantity', 400)
  }

  const seen = new Set<string>()
  for (const variant of variants) {
    const key = attributesKey(canonicalizeAttributes(variant.attributes ?? {}))
    if (seen.has(key)) {
      throw new CustomError('DUPLICATE_VARIANT', 'Duplicate variants in the same request', 409)
    }
    seen.add(key)
    parseMoney(variant.sellPrice, 'sellPrice', true)
    parseMoney(variant.unitCost, 'unitCost')
    parseQuantity(variant.quantity)
  }

  const family = await findOrCreateProductFamily(prisma, name, { description: input.description })

  if (input.description !== undefined || input.isActive !== undefined || input.availableOnline !== undefined) {
    await prisma.productFamily.update({
      where: { id: family.id },
      data: {
        description: input.description !== undefined ? input.description : undefined,
        isActive: input.isActive,
        availableOnline: input.availableOnline,
      },
    })
  }

  for (const variant of variants) {
    await upsertFamilyVariant(family.id, {
      attributes: canonicalizeAttributes(variant.attributes ?? {}),
      unitCost: variant.unitCost,
      sellPrice: variant.sellPrice,
      quantity: variant.quantity,
      isActive: variant.isActive,
      availableOnline: variant.availableOnline,
      shopId,
    })
  }

  return getFamilyById(family.id)
}

export async function updateFamily(familyId: string, input: UpdateFamilyInput) {
  const family = await getFamilyById(familyId)
  const nextName = input.name?.trim()
  const data: Prisma.ProductFamilyUpdateInput = {
    description: input.description,
    isActive: input.isActive,
    availableOnline: input.availableOnline,
  }

  if (nextName && nextName !== family.name) {
    const parsed = parseProductFamily(nextName)
    data.name = parsed.category
  }

  const updated = await prisma.productFamily.update({
    where: { id: familyId },
    data,
  })

  if (nextName && nextName !== family.name) {
    const products = await prisma.product.findMany({ where: { familyId } })
    for (const product of products) {
      const attrs = attributesFromUnknown(product.attributes)
      await prisma.product.update({
        where: { id: product.id },
        data: {
          name: skuName(updated.name, attrs),
          category: updated.name,
        },
      })
    }
  }

  if (input.isActive !== undefined || input.availableOnline !== undefined) {
    await prisma.product.updateMany({
      where: { familyId },
      data: {
        ...(input.isActive !== undefined ? { isActive: input.isActive } : {}),
        ...(input.availableOnline !== undefined ? { availableOnline: input.availableOnline } : {}),
      },
    })
  }

  return getFamilyById(familyId)
}

export async function addFamilyImage(familyId: string, file: { buffer: Buffer; mimetype: string; size: number }) {
  await getFamilyById(familyId)
  assertImageFile(file)
  const stored = persistImageBuffer(file.buffer, file.mimetype)
  const last = await prisma.productImage.findFirst({
    where: { familyId },
    orderBy: { sortOrder: 'desc' },
  })
  return prisma.productImage.create({
    data: {
      familyId,
      filename: stored.filename,
      url: stored.url,
      mimeType: file.mimetype,
      sortOrder: (last?.sortOrder ?? -1) + 1,
    },
  })
}

export async function removeFamilyImage(familyId: string, imageId: string) {
  const image = await prisma.productImage.findFirst({
    where: { id: imageId, familyId },
  })
  if (!image) {
    throw new CustomError('PRODUCT_NOT_FOUND', 'Image not found', 404)
  }
  await prisma.productImage.delete({ where: { id: imageId } })
  deleteStoredImage(image.filename)
  return image
}

export async function setPrimaryFamilyImage(familyId: string, imageId: string) {
  await getFamilyById(familyId)
  const images = await prisma.productImage.findMany({
    where: { familyId },
    orderBy: { sortOrder: 'asc' },
  })
  const target = images.find((image) => image.id === imageId)
  if (!target) {
    throw new CustomError('PRODUCT_NOT_FOUND', 'Image not found', 404)
  }

  const ordered = [target, ...images.filter((image) => image.id !== imageId)]
  await prisma.$transaction(
    ordered.map((image, index) =>
      prisma.productImage.update({
        where: { id: image.id },
        data: { sortOrder: index },
      }),
    ),
  )

  return prisma.productImage.findUniqueOrThrow({ where: { id: imageId } })
}

export async function createProduct(input: CreateProductInput) {
  const name = input.name?.trim()
  if (!name) {
    throw new CustomError('VALIDATION_ERROR', 'name is required', 400)
  }
  const sellPrice = parseMoney(input.sellPrice, 'sellPrice', true)!
  const unitCost = parseMoney(input.unitCost, 'unitCost') ?? 0
  const parsed = parseProductFamily(name, input.category)
  const attributes = canonicalizeAttributes(
    input.attributes && Object.keys(input.attributes).length > 0
      ? input.attributes
      : parseAttributesFromLabel(parsed.variantLabel),
  )
  const family = await findOrCreateProductFamily(prisma, name, {
    description: input.description,
    categoryHint: input.category ?? parsed.category,
  })

  const result = await upsertFamilyVariant(
    family.id,
    {
      attributes,
      unitCost,
      sellPrice,
      quantity: input.quantity,
      shopId: input.shopId,
      isActive: input.isActive,
      availableOnline: input.availableOnline,
    },
    { description: input.description, galatkProductRef: input.galatkProductRef },
  )

  return prisma.product.findUniqueOrThrow({
    where: { id: result.product.id },
    include: { family: true },
  })
}

export async function getProductById(productId: string) {
  const product = await prisma.product.findUnique({
    where: { id: productId },
    include: { family: true },
  })
  if (!product) {
    throw new CustomError('PRODUCT_NOT_FOUND', 'Product not found', 404)
  }
  return product
}

export async function updateProduct(productId: string, input: UpdateProductInput) {
  const product = await getProductById(productId)
  const nextAttributes =
    input.attributes !== undefined
      ? canonicalizeAttributes(input.attributes)
      : attributesFromUnknown(product.attributes)
  const nextKey = attributesKey(nextAttributes)

  if (product.familyId && nextKey !== product.attributesKey) {
    const clash = await prisma.product.findFirst({
      where: { familyId: product.familyId, attributesKey: nextKey, NOT: { id: productId } },
    })
    if (clash) {
      throw new CustomError(
        'DUPLICATE_VARIANT',
        'A variant with these attributes already exists for this product',
        409,
      )
    }
  }

  const familyName = product.family?.name ?? parseProductFamily(product.name, product.category).category

  try {
    return await prisma.product.update({
      where: { id: productId },
      data: {
        name: input.name?.trim() || skuName(familyName, nextAttributes),
        description: input.description,
        unitCost: input.unitCost !== undefined ? parseMoney(input.unitCost, 'unitCost') : undefined,
        sellPrice: input.sellPrice !== undefined ? parseMoney(input.sellPrice, 'sellPrice') : undefined,
        galatkProductRef: input.galatkProductRef,
        isActive: input.isActive,
        availableOnline: input.availableOnline,
        attributes: nextAttributes,
        attributesKey: nextKey,
        variantLabel: formatVariantLabel(nextAttributes),
        category: familyName,
      },
      include: { family: true },
    })
  } catch (error) {
    if (isUniqueConstraint(error)) {
      throw new CustomError(
        'DUPLICATE_VARIANT',
        'A variant with these attributes already exists for this product',
        409,
      )
    }
    throw error
  }
}

export async function deleteProduct(productId: string) {
  await getProductById(productId)

  const [saleLines, orderLines, inboundLines] = await Promise.all([
    prisma.saleLine.count({ where: { productId } }),
    prisma.onlineOrderLine.count({ where: { productId } }),
    prisma.inboundTransferLine.count({ where: { productId } }),
  ])

  if (saleLines > 0 || orderLines > 0 || inboundLines > 0) {
    throw new CustomError(
      'VARIANT_IN_USE',
      'This variant cannot be deleted because it is used in sales, orders, or inbound transfers',
      409,
    )
  }

  try {
    await prisma.product.delete({ where: { id: productId } })
  } catch (error) {
    if (isForeignKeyConstraint(error)) {
      throw new CustomError(
        'VARIANT_IN_USE',
        'This variant cannot be deleted because it is still referenced by other records',
        409,
      )
    }
    throw error
  }
}

export async function setVariantStock(productId: string, shopId: string, quantity: number) {
  if (!shopId) {
    throw new CustomError('VALIDATION_ERROR', 'shopId is required', 400)
  }
  const parsed = parseQuantity(quantity)
  await getProductById(productId)

  const next = await prisma.$transaction(async (tx) => {
    return setShopStockQuantity(tx, shopId, productId, parsed)
  })

  return { productId, shopId, quantity: next, inStock: next > 0 }
}

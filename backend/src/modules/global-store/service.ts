import prisma from '../../resources/database/initDatabase.js'
import { CustomError } from '../../shared/types/error_type.js'
import { checkoutForShop, CheckoutInput } from '../storefront/service.js'
import { GlobalCheckoutInput, PublicCatalogProductDetail, PublicCatalogProductSummary } from './types.js'
import { lookupCustomerByPhone } from '../../shared/clients/upsertFromOnline.js'
import { presentCatalogFamily, toCatalogSummary } from './presenter.js'

export { lookupCustomerByPhone }

const familyCatalogInclude = {
  images: { orderBy: { sortOrder: 'asc' as const } },
  products: { orderBy: { name: 'asc' as const } },
}

export async function listGlobalShops() {
  const shops = await prisma.shop.findMany({
    orderBy: { name: 'asc' },
  })

  return shops.map((shop) => ({
    id: shop.id,
    name: shop.name,
    slug: shop.slug,
    address: shop.address,
    serviceCity: shop.serviceCity,
    deliveryFee: shop.deliveryFee.toString(),
  }))
}

async function loadCatalogContext() {
  const [shops, families] = await Promise.all([
    prisma.shop.findMany(),
    prisma.productFamily.findMany({
      where: { isActive: true, availableOnline: true },
      include: familyCatalogInclude,
      orderBy: { name: 'asc' },
    }),
  ])

  const shopById = new Map(shops.map((shop) => [shop.id, shop]))
  const productIds = families.flatMap((family) => family.products.map((product) => product.id))
  const stock =
    productIds.length === 0
      ? []
      : await prisma.shopStock.findMany({
          where: { productId: { in: productIds } },
        })

  return { shopById, families, stock }
}

/**
 * Aggregates the published catalog as product families (not SKUs).
 * Only families and variants that are active, available online, and
 * associated with at least one visible shop are returned.
 */
export async function listGlobalProducts(): Promise<PublicCatalogProductSummary[]> {
  const { shopById, families, stock } = await loadCatalogContext()

  return families
    .map((family) => presentCatalogFamily(family, stock, shopById))
    .filter((family): family is PublicCatalogProductDetail => family !== null)
    .map(toCatalogSummary)
}

/**
 * Storefront product detail. `idOrSlug` may be the family id, family slug,
 * or a variant SKU id (resolved to its family). Unpublished / inactive
 * families return the same not-found error as missing records.
 */
export async function getGlobalProduct(idOrSlug: string): Promise<PublicCatalogProductDetail> {
  const trimmed = idOrSlug.trim()
  if (!trimmed) {
    throw new CustomError('PRODUCT_NOT_FOUND', 'Product not found', 404)
  }

  let family = await prisma.productFamily.findFirst({
    where: { OR: [{ id: trimmed }, { slug: trimmed }] },
    include: familyCatalogInclude,
  })

  if (!family) {
    const sku = await prisma.product.findUnique({
      where: { id: trimmed },
      select: { familyId: true },
    })
    if (sku?.familyId) {
      family = await prisma.productFamily.findUnique({
        where: { id: sku.familyId },
        include: familyCatalogInclude,
      })
    }
  }

  if (!family) {
    throw new CustomError('PRODUCT_NOT_FOUND', 'Product not found', 404)
  }

  const shops = await prisma.shop.findMany()
  const shopById = new Map(shops.map((shop) => [shop.id, shop]))
  const stock = await prisma.shopStock.findMany({
    where: { productId: { in: family.products.map((product) => product.id) } },
  })

  const presented = presentCatalogFamily(family, stock, shopById)
  if (!presented) {
    throw new CustomError('PRODUCT_NOT_FOUND', 'Product not found', 404)
  }

  return presented
}

/**
 * Splits a multi-shop cart into per-shop groups and runs the existing
 * single-shop checkout for each group. Produces one OnlineOrder per shop
 * represented in the cart (e.g. item bought from shop 1, another from shop 2).
 * Each shop's checkout runs in its own transaction; if one shop's checkout
 * fails (e.g. insufficient stock), previously completed shop orders are not
 * rolled back since they are independent orders, but the failure is
 * reported so the caller knows which shop failed.
 */
export async function globalCheckout(input: GlobalCheckoutInput) {
  if (!input.lines?.length) {
    throw new CustomError('VALIDATION_ERROR', 'Cart is empty', 400)
  }

  const linesByShop = new Map<string, GlobalCheckoutInput['lines']>()
  for (const line of input.lines) {
    if (!line.shopId) {
      throw new CustomError('VALIDATION_ERROR', 'Each cart line must specify a shopId', 400)
    }
    const existing = linesByShop.get(line.shopId) ?? []
    existing.push(line)
    linesByShop.set(line.shopId, existing)
  }

  const shopIds = Array.from(linesByShop.keys())
  const shops = await prisma.shop.findMany({ where: { id: { in: shopIds } } })
  const shopById = new Map(shops.map((s) => [s.id, s]))

  const missing = shopIds.filter((id) => !shopById.has(id))
  if (missing.length > 0) {
    throw new CustomError('SHOP_NOT_FOUND', `Shop(s) not found: ${missing.join(', ')}`, 404)
  }

  const orders = []
  for (const [shopId, lines] of linesByShop) {
    const shop = shopById.get(shopId)!

    const checkoutInput: CheckoutInput = {
      fulfillmentType: input.fulfillmentType,
      customerName: input.customerName,
      customerPhone: input.customerPhone,
      customerWilaya: input.customerWilaya,
      customerEmail: input.customerEmail,
      deliveryAddress: input.deliveryAddress,
      deliveryCity: input.deliveryCity,
      lines: lines.map((l) => ({ productId: l.productId, quantity: l.quantity })),
    }

    const order = await checkoutForShop(shop, checkoutInput)
    orders.push(order)
  }

  return orders
}

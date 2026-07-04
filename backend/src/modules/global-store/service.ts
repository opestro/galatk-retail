import prisma from '../../resources/database/initDatabase.js'
import { CustomError } from '../../shared/types/error_type.js'
import { checkoutForShop, CheckoutInput } from '../storefront/service.js'
import { OutOfStockDisplay } from '@prisma/client'
import { GlobalCheckoutInput } from './types.js'
import { lookupCustomerByPhone } from '../../shared/clients/upsertFromOnline.js'

export { lookupCustomerByPhone }

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

/**
 * Aggregates the active, online-available catalog across all shops. Each
 * product lists every shop that currently carries it (with stock/price),
 * so the global store can let a customer pick which shop to buy each item
 * from.
 */
export async function listGlobalProducts() {
  const shops = await prisma.shop.findMany()
  const shopById = new Map(shops.map((s) => [s.id, s]))

  const stock = await prisma.shopStock.findMany({
    where: {
      product: { isActive: true, availableOnline: true },
    },
    include: { product: true },
  })

  const byProduct = new Map<
    string,
    {
      productId: string
      name: string
      description: string | null
      sellPrice: string
      shops: { shopId: string; shopName: string; shopSlug: string; quantity: number; inStock: boolean }[]
    }
  >()

  for (const s of stock) {
    const shop = shopById.get(s.shopId)
    if (!shop) continue

    const showOutOfStock = shop.outOfStockDisplay === OutOfStockDisplay.SHOW_UNAVAILABLE
    if (s.quantity <= 0 && !showOutOfStock) continue

    let entry = byProduct.get(s.productId)
    if (!entry) {
      entry = {
        productId: s.productId,
        name: s.product.name,
        description: s.product.description,
        sellPrice: s.product.sellPrice.toString(),
        shops: [],
      }
      byProduct.set(s.productId, entry)
    }

    entry.shops.push({
      shopId: shop.id,
      shopName: shop.name,
      shopSlug: shop.slug,
      quantity: s.quantity,
      inStock: s.quantity > 0,
    })
  }

  return Array.from(byProduct.values()).filter((p) => p.shops.length > 0)
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

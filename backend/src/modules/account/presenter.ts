import {
  Customer,
  OnlineOrder,
  OnlineOrderLine,
  Product,
  ProductFamily,
  ProductImage,
  Sale,
  SaleLine,
  Shop,
} from '@prisma/client'
import { Decimal } from '@prisma/client/runtime/library'
import { orderLinePresenter } from '../storefront/presenter.js'
import {
  CustomerCreditPortionResponse,
  CustomerCreditResponse,
  CustomerShopBalanceResponse,
} from './types.js'

export function customerPresenter(customer: Pick<Customer, 'id' | 'name' | 'phone' | 'email'>) {
  return {
    id: customer.id,
    name: customer.name,
    phone: customer.phone,
    email: customer.email,
  }
}

type CustomerOrderLine = OnlineOrderLine & {
  product: Product & {
    family?: (ProductFamily & { images?: Pick<ProductImage, 'url' | 'sortOrder'>[] }) | null
  }
}

type FulfillmentSaleCredit = {
  amountPaid?: { toString(): string } | string | number | null
  amountOnCredit?: { toString(): string } | string | number | null
  creditPortions?: Array<{ remainingAmount: { toString(): string } | string | number }>
}

export type CustomerOrderRecord = OnlineOrder & {
  shop: Pick<Shop, 'id' | 'name' | 'slug'>
  lines: CustomerOrderLine[]
  fulfillmentSale?: FulfillmentSaleCredit | null
}

type SaleLineWithProduct = SaleLine & { product: Pick<Product, 'id' | 'name'> }

export type CustomerSaleRecord = Sale & {
  shop: Pick<Shop, 'id' | 'name' | 'slug'>
  lines: SaleLineWithProduct[]
  creditPortions?: Array<{ remainingAmount: { toString(): string } | string | number }>
}

export type CustomerCreditClientRecord = {
  id: string
  shopId: string
  balance: { toString(): string } | string | number
  shop: Pick<Shop, 'id' | 'name' | 'slug'>
  creditPortions: Array<{
    id: string
    originalAmount: { toString(): string } | string | number
    remainingAmount: { toString(): string } | string | number
    createdAt: Date
    sale: {
      id: string
      status: string
      onlineOrder: { id: string; orderNumber: string } | null
    } | null
  }>
}

/** Online orders still waiting for pickup/delivery payment (no fulfillment sale yet). */
export type OpenUnpaidOrderRecord = {
  id: string
  orderNumber: string
  total: { toString(): string } | string | number
  createdAt: Date
  shop: Pick<Shop, 'id' | 'name' | 'slug'>
}

function money(value: { toString(): string } | string | number | null | undefined): string {
  if (value === null || value === undefined) return '0'
  return typeof value === 'string' ? value : value.toString()
}

/** Sum of remaining amounts on open credit portions (customer-visible unpaid credit). */
export function remainingCreditFromPortions(
  portions?: Array<{ remainingAmount: { toString(): string } | string | number }> | null,
): string {
  if (!portions?.length) return '0'
  const total = portions.reduce(
    (sum, portion) => sum.add(new Decimal(money(portion.remainingAmount))),
    new Decimal(0),
  )
  return total.toString()
}

/**
 * Amount the customer still owes on this order.
 * Open COD / pay-on-pickup orders count as unpaid until collected or cancelled.
 * After fulfillment, only remaining FIFO credit portions count.
 */
export function remainingUnpaidForOrder(order: CustomerOrderRecord): string {
  if (order.status === 'CANCELLED') return '0'
  if (order.fulfillmentSale) {
    return remainingCreditFromPortions(order.fulfillmentSale.creditPortions)
  }
  if (order.status === 'COMPLETED') return '0'
  return money(order.total)
}

/**
 * Public order shape for the client space.
 * Exposes remaining unpaid credit; never staff-only fields such as creditApprovedBy.
 */
export function customerOrderPresenter(order: CustomerOrderRecord) {
  const sale = order.fulfillmentSale
  return {
    id: order.id,
    orderNumber: order.orderNumber,
    status: order.status,
    fulfillmentType: order.fulfillmentType,
    deliveryService: order.deliveryService,
    paymentMethod: order.paymentMethod,
    customerName: order.customerName,
    customerPhone: order.customerPhone,
    customerWilaya: order.customerWilaya,
    subtotal: money(order.subtotal),
    deliveryFee: money(order.deliveryFee),
    total: money(order.total),
    amountPaid: sale ? money(sale.amountPaid) : '0',
    amountOnCredit: sale ? money(sale.amountOnCredit) : '0',
    remainingCredit: remainingUnpaidForOrder(order),
    createdAt: order.createdAt,
    shop: {
      id: order.shop.id,
      name: order.shop.name,
      slug: order.shop.slug,
    },
    lines: order.lines.map(orderLinePresenter),
  }
}

/** In-store POS purchase for the signed-in customer (not duplicated as an online order). */
export function customerSalePresenter(sale: CustomerSaleRecord) {
  return {
    id: sale.id,
    type: 'SALE' as const,
    status: sale.status,
    paymentMethod: sale.paymentMethod,
    total: money(sale.total),
    amountPaid: money(sale.amountPaid),
    amountOnCredit: money(sale.amountOnCredit),
    remainingCredit: remainingCreditFromPortions(sale.creditPortions),
    createdAt: sale.createdAt,
    shop: {
      id: sale.shop.id,
      name: sale.shop.name,
      slug: sale.shop.slug,
    },
    lines: sale.lines.map((line) => ({
      productId: line.productId,
      productName: line.product.name,
      quantity: line.quantity,
      unitPrice: money(line.unitPrice),
      lineTotal: money(line.lineTotal),
    })),
  }
}

function addShopBalance(
  shops: Map<string, CustomerShopBalanceResponse>,
  shop: Pick<Shop, 'id' | 'name' | 'slug'>,
  amount: Decimal,
) {
  const existing = shops.get(shop.id)
  if (existing) {
    existing.balance = new Decimal(existing.balance).add(amount).toString()
    return
  }
  shops.set(shop.id, {
    shopId: shop.id,
    shopName: shop.name,
    shopSlug: shop.slug,
    balance: amount.toString(),
  })
}

/**
 * Outstanding amount the customer still owes: shop pay-later balances plus
 * open online orders that have not been collected at the counter yet.
 */
export function customerCreditPresenter(
  clients: CustomerCreditClientRecord[],
  openOrders: OpenUnpaidOrderRecord[] = [],
): CustomerCreditResponse {
  const shops = new Map<string, CustomerShopBalanceResponse>()
  const portions: CustomerCreditPortionResponse[] = []
  let totalOutstanding = new Decimal(0)

  for (const client of clients) {
    const balance = new Decimal(money(client.balance))
    if (balance.gt(0)) {
      totalOutstanding = totalOutstanding.add(balance)
      addShopBalance(shops, client.shop, balance)
    }

    for (const portion of client.creditPortions) {
      portions.push({
        id: portion.id,
        shopId: client.shop.id,
        shopName: client.shop.name,
        shopSlug: client.shop.slug,
        originalAmount: money(portion.originalAmount),
        remainingAmount: money(portion.remainingAmount),
        createdAt: portion.createdAt,
        saleId: portion.sale?.id ?? null,
        saleStatus: portion.sale?.status ?? null,
        orderId: portion.sale?.onlineOrder?.id ?? null,
        orderNumber: portion.sale?.onlineOrder?.orderNumber ?? null,
      })
    }
  }

  for (const order of openOrders) {
    const amount = new Decimal(money(order.total))
    if (amount.lte(0)) continue
    totalOutstanding = totalOutstanding.add(amount)
    addShopBalance(shops, order.shop, amount)
    portions.push({
      id: `order:${order.id}`,
      shopId: order.shop.id,
      shopName: order.shop.name,
      shopSlug: order.shop.slug,
      originalAmount: amount.toString(),
      remainingAmount: amount.toString(),
      createdAt: order.createdAt,
      saleId: null,
      saleStatus: null,
      orderId: order.id,
      orderNumber: order.orderNumber,
    })
  }

  const shopList = Array.from(shops.values()).sort((a, b) => a.shopName.localeCompare(b.shopName))
  portions.sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime())

  return {
    totalOutstanding: totalOutstanding.toString(),
    shops: shopList,
    portions,
  }
}

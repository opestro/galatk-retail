import prisma from '../../resources/database/initDatabase.js'
import { CustomError } from '../../shared/types/error_type.js'
import { AuthenticatedStaff, assertShopAccess, requireMinRole } from '../../shared/middlewares/shopScope.js'
import { decrementShopStock, restoreShopStock } from '../../shared/stock/stockMutations.js'
import { findOrCreateClientFromOnlineOrder } from '../../shared/clients/upsertFromOnline.js'
import { assertCreditWithinLimit } from '../../shared/credit/limitCheck.js'
import {
  ClientLedgerEntryType,
  FulfillmentType,
  OnlinePaymentMethod,
  OrderStatus,
  OutOfStockDisplay,
  PaymentMethod,
  StaffRole,
} from '@prisma/client'
import { Decimal } from '@prisma/client/runtime/library'

export interface CheckoutLineInput {
  productId: string
  quantity: number
}

export interface CheckoutInput {
  fulfillmentType: FulfillmentType
  customerName: string
  customerPhone: string
  customerEmail?: string
  deliveryAddress?: string
  deliveryCity?: string
  lines: CheckoutLineInput[]
}

export interface CompleteOnlineOrderInput {
  paymentMethod: PaymentMethod
  amountPaid?: number
  payLater?: boolean
  creditLimitOverride?: boolean
}

function normalizeCity(city: string): string {
  return city.trim().toLowerCase()
}

async function generateOrderNumber(shopId: string): Promise<string> {
  const count = await prisma.onlineOrder.count({ where: { shopId } })
  return `ORD-${String(count + 1).padStart(5, '0')}`
}

export async function getPublicShopInfo(slug: string) {
  const shop = await prisma.shop.findUnique({ where: { slug } })
  if (!shop) {
    throw new CustomError('SHOP_NOT_FOUND', 'Shop not found', 404)
  }

  return {
    id: shop.id,
    name: shop.name,
    slug: shop.slug,
    address: shop.address,
    contactPhone: shop.contactPhone,
    serviceCity: shop.serviceCity,
    deliveryFee: shop.deliveryFee.toString(),
    outOfStockDisplay: shop.outOfStockDisplay,
  }
}

export async function listStorefrontProducts(slug: string) {
  const shop = await prisma.shop.findUnique({ where: { slug } })
  if (!shop) {
    throw new CustomError('SHOP_NOT_FOUND', 'Shop not found', 404)
  }

  const stock = await prisma.shopStock.findMany({
    where: {
      shopId: shop.id,
      product: { isActive: true, availableOnline: true },
    },
    include: { product: true },
  })

  return stock
    .filter((s) => shop.outOfStockDisplay === OutOfStockDisplay.SHOW_UNAVAILABLE || s.quantity > 0)
    .map((s) => ({
      productId: s.productId,
      name: s.product.name,
      description: s.product.description,
      sellPrice: s.product.sellPrice.toString(),
      inStock: s.quantity > 0,
      quantity: s.quantity,
    }))
}

export async function checkout(slug: string, input: CheckoutInput) {
  const shop = await prisma.shop.findUnique({ where: { slug } })
  if (!shop) {
    throw new CustomError('SHOP_NOT_FOUND', 'Shop not found', 404)
  }

  if (!input.lines?.length) {
    throw new CustomError('VALIDATION_ERROR', 'Cart is empty', 400)
  }

  if (!input.customerName || !input.customerPhone) {
    throw new CustomError('VALIDATION_ERROR', 'Customer name and phone required', 400)
  }

  if (input.fulfillmentType === FulfillmentType.DELIVERY) {
    if (!input.deliveryAddress || !input.deliveryCity) {
      throw new CustomError('VALIDATION_ERROR', 'Delivery address and city required', 400)
    }
    if (normalizeCity(input.deliveryCity) !== normalizeCity(shop.serviceCity)) {
      throw new CustomError('CITY_MISMATCH', 'Delivery not available in this city', 400)
    }
  }

  const products = await Promise.all(
    input.lines.map(async (line) => {
      const product = await prisma.product.findUnique({ where: { id: line.productId } })
      if (!product || !product.isActive || !product.availableOnline) {
        throw new CustomError('PRODUCT_NOT_FOUND', `Product ${line.productId} unavailable`, 404)
      }
      return { product, quantity: line.quantity }
    }),
  )

  const subtotal = products.reduce(
    (sum, { product, quantity }) => sum.add(product.sellPrice.mul(quantity)),
    new Decimal(0),
  )

  const deliveryFee =
    input.fulfillmentType === FulfillmentType.DELIVERY ? shop.deliveryFee : new Decimal(0)
  const total = subtotal.add(deliveryFee)
  const orderNumber = await generateOrderNumber(shop.id)

  const client = await findOrCreateClientFromOnlineOrder(shop.id, {
    name: input.customerName,
    phone: input.customerPhone,
    email: input.customerEmail,
    address: input.deliveryAddress,
  })

  return prisma.$transaction(async (tx) => {
    await decrementShopStock(
      tx,
      shop.id,
      input.lines.map((l) => ({ productId: l.productId, quantity: l.quantity })),
    )

    return tx.onlineOrder.create({
      data: {
        shopId: shop.id,
        orderNumber,
        fulfillmentType: input.fulfillmentType,
        customerName: input.customerName,
        customerPhone: input.customerPhone,
        customerEmail: input.customerEmail ?? null,
        deliveryAddress: input.deliveryAddress ?? null,
        deliveryCity: input.deliveryCity ?? null,
        paymentMethod: OnlinePaymentMethod.PAY_ON_PICKUP,
        clientId: client.id,
        subtotal,
        deliveryFee,
        total,
        lines: {
          create: products.map(({ product, quantity }) => ({
            productId: product.id,
            quantity,
            unitPrice: product.sellPrice,
            lineTotal: product.sellPrice.mul(quantity),
          })),
        },
      },
    })
  })
}

export async function listOrders(staff: AuthenticatedStaff, shopId: string, status?: OrderStatus) {
  assertShopAccess(staff, shopId)

  return prisma.onlineOrder.findMany({
    where: { shopId, ...(status ? { status } : {}) },
    include: {
      lines: { include: { product: true } },
      client: { select: { id: true, name: true, phone: true, balance: true } },
    },
    orderBy: { createdAt: 'desc' },
    take: 100,
  })
}

export async function getOrderById(staff: AuthenticatedStaff, shopId: string, orderId: string) {
  assertShopAccess(staff, shopId)

  const order = await prisma.onlineOrder.findFirst({
    where: { id: orderId, shopId },
    include: {
      lines: { include: { product: true } },
      client: { select: { id: true, name: true, phone: true, balance: true, creditLimit: true } },
      fulfillmentSale: true,
    },
  })

  if (!order) {
    throw new CustomError('ORDER_NOT_FOUND', 'Order not found', 404)
  }

  return order
}

const validTransitions: Record<OrderStatus, OrderStatus[]> = {
  [OrderStatus.PLACED]: [OrderStatus.READY_FOR_PICKUP, OrderStatus.OUT_FOR_DELIVERY, OrderStatus.CANCELLED],
  [OrderStatus.READY_FOR_PICKUP]: [OrderStatus.COMPLETED, OrderStatus.CANCELLED],
  [OrderStatus.OUT_FOR_DELIVERY]: [OrderStatus.COMPLETED, OrderStatus.CANCELLED],
  [OrderStatus.COMPLETED]: [],
  [OrderStatus.CANCELLED]: [],
}

export async function updateOrderStatus(
  staff: AuthenticatedStaff,
  shopId: string,
  orderId: string,
  status: OrderStatus,
) {
  assertShopAccess(staff, shopId)
  const order = await getOrderById(staff, shopId, orderId)

  if (status === OrderStatus.COMPLETED) {
    throw new CustomError(
      'USE_COMPLETE_ENDPOINT',
      'Use POST /orders/:orderId/complete with payment details to complete an order',
      400,
    )
  }

  const allowed = validTransitions[order.status]
  if (!allowed.includes(status)) {
    throw new CustomError('INVALID_TRANSITION', `Cannot transition from ${order.status} to ${status}`, 400)
  }

  return prisma.onlineOrder.update({
    where: { id: orderId },
    data: { status },
    include: { lines: { include: { product: true } }, client: true },
  })
}

export async function completeOnlineOrder(
  staff: AuthenticatedStaff,
  shopId: string,
  orderId: string,
  input: CompleteOnlineOrderInput,
) {
  assertShopAccess(staff, shopId)
  const order = await getOrderById(staff, shopId, orderId)

  if (![OrderStatus.READY_FOR_PICKUP, OrderStatus.OUT_FOR_DELIVERY].includes(order.status)) {
    throw new CustomError(
      'INVALID_TRANSITION',
      'Order must be ready for pickup or out for delivery before completion',
      400,
    )
  }

  if (order.fulfillmentSale) {
    throw new CustomError('ORDER_ALREADY_COMPLETED', 'Order payment already recorded', 400)
  }

  if (!order.clientId) {
    throw new CustomError('CLIENT_REQUIRED', 'Order has no linked client', 400)
  }

  const total = order.total
  let amountPaid: Decimal
  let amountOnCredit: Decimal
  let creditApprovedById: string | null = null

  if (input.payLater) {
    requireMinRole(staff, StaffRole.MANAGER)
    amountPaid = new Decimal(0)
    amountOnCredit = total
    creditApprovedById = staff.id
  } else {
    amountPaid = input.amountPaid !== undefined ? new Decimal(input.amountPaid) : total
    amountOnCredit = total.sub(amountPaid)
  }

  if (!amountPaid.add(amountOnCredit).equals(total)) {
    throw new CustomError(
      'VALIDATION_ERROR',
      'amountPaid plus amountOnCredit must equal order total',
      400,
    )
  }

  const clientRecord = await prisma.client.findFirst({
    where: { id: order.clientId, isActive: true },
  })

  if (!clientRecord) {
    throw new CustomError('CLIENT_NOT_FOUND', 'Active client not found', 404)
  }

  if (amountOnCredit.gt(0)) {
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

  if (!Object.values(PaymentMethod).includes(input.paymentMethod)) {
    throw new CustomError('VALIDATION_ERROR', 'Invalid payment method', 400)
  }

  return prisma.$transaction(async (tx) => {
    const sale = await tx.sale.create({
      data: {
        shopId,
        cashierId: staff.id,
        paymentMethod: input.paymentMethod,
        subtotal: order.subtotal,
        total,
        amountPaid,
        amountOnCredit,
        clientId: order.clientId,
        creditApprovedById,
        onlineOrderId: order.id,
        lines: {
          create: order.lines.map((line) => ({
            productId: line.productId,
            quantity: line.quantity,
            unitPrice: line.unitPrice,
            lineTotal: line.lineTotal,
          })),
        },
      },
    })

    if (amountOnCredit.gt(0) && order.clientId) {
      await tx.clientCreditPortion.create({
        data: {
          clientId: order.clientId,
          saleId: sale.id,
          originalAmount: amountOnCredit,
          remainingAmount: amountOnCredit,
        },
      })

      await tx.client.update({
        where: { id: order.clientId },
        data: { balance: { increment: amountOnCredit } },
      })

      await tx.clientLedgerEntry.create({
        data: {
          clientId: order.clientId,
          type: ClientLedgerEntryType.SALE_CREDIT,
          amount: amountOnCredit,
          saleId: sale.id,
          recordedById: staff.id,
          note: `Online order ${order.orderNumber}`,
        },
      })
    }

    return tx.onlineOrder.update({
      where: { id: orderId },
      data: { status: OrderStatus.COMPLETED },
      include: {
        lines: { include: { product: true } },
        client: true,
        fulfillmentSale: true,
      },
    })
  })
}

export async function cancelOrder(
  staff: AuthenticatedStaff,
  shopId: string,
  orderId: string,
  reason?: string,
) {
  assertShopAccess(staff, shopId)
  requireMinRole(staff, StaffRole.MANAGER)

  const order = await getOrderById(staff, shopId, orderId)

  if (order.status === OrderStatus.COMPLETED || order.status === OrderStatus.CANCELLED) {
    throw new CustomError('CANCEL_DENIED', 'Order cannot be cancelled', 400)
  }

  return prisma.$transaction(async (tx) => {
    await restoreShopStock(
      tx,
      shopId,
      order.lines.map((l) => ({ productId: l.productId, quantity: l.quantity })),
    )

    return tx.onlineOrder.update({
      where: { id: orderId },
      data: {
        status: OrderStatus.CANCELLED,
        cancelledById: staff.id,
        cancelledAt: new Date(),
        cancelReason: reason ?? null,
      },
      include: { lines: { include: { product: true } } },
    })
  })
}

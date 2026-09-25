import prisma from '../../resources/database/initDatabase.js'
import { CustomError } from '../../shared/types/error_type.js'
import { AuthenticatedStaff, assertShopAccess, requireMinRole } from '../../shared/middlewares/shopScope.js'
import { decrementShopStock, restoreShopStock } from '../../shared/stock/stockMutations.js'
import { findOrCreateClientFromOnlineOrder } from '../../shared/clients/upsertFromOnline.js'
import { assertCreditWithinLimit } from '../../shared/credit/limitCheck.js'
import { canonicalWilaya } from '../../shared/geo/algeriaWilayas.js'
import { normalizeAlgerianPhone, validateCustomerName } from '../../shared/validation/algerianPhone.js'
import {
  ClientLedgerEntryType,
  FulfillmentType,
  OnlinePaymentMethod,
  OrderStatus,
  OutOfStockDisplay,
  PaymentMethod,
  Prisma,
  StaffRole,
} from '@prisma/client'
import { Decimal } from '@prisma/client/runtime/library'
import { withFamily } from '../../shared/products/withFamily.js'
import { canTransitionOrderStatus } from '../../shared/orders/statusTransitions.js'

export interface CheckoutLineInput {
  productId: string
  quantity: number
}

export interface CheckoutInput {
  fulfillmentType: FulfillmentType
  customerName: string
  customerPhone: string
  customerWilaya: string
  customerEmail?: string
  deliveryAddress?: string
  deliveryCity?: string
  /** Required for guest checkout; omitted when `authenticatedCustomerId` is set. */
  password?: string
  authenticatedCustomerId?: string
  lines: CheckoutLineInput[]
}

export interface CompleteOnlineOrderInput {
  paymentMethod: PaymentMethod
  amountPaid?: number
  payLater?: boolean
  creditLimitOverride?: boolean
}

const orderProductInclude = {
  product: {
    include: {
      family: {
        include: {
          images: { orderBy: { sortOrder: 'asc' as const }, take: 1 },
        },
      },
    },
  },
} as const

export async function checkoutForShop(
  shop: { id: string; slug: string; serviceCity: string; deliveryFee: Decimal },
  input: CheckoutInput,
) {
  if (!input.lines?.length) {
    throw new CustomError('VALIDATION_ERROR', 'Cart is empty', 400)
  }

  let customerName = validateCustomerName(input.customerName)
  let customerPhone = normalizeAlgerianPhone(input.customerPhone)

  if (input.authenticatedCustomerId) {
    const account = await prisma.customer.findUnique({
      where: { id: input.authenticatedCustomerId },
    })
    if (!account) {
      throw new CustomError('UNAUTHORIZED', 'Sign in to continue.', 401)
    }
    customerPhone = account.phone
    if (!customerName) {
      customerName = account.name
    }
  }

  if (!customerName) {
    throw new CustomError('VALIDATION_ERROR', 'Please enter your full name.', 400)
  }

  if (!customerPhone) {
    throw new CustomError(
      'VALIDATION_ERROR',
      'Please enter a valid Algerian phone number (05, 06, or 07).',
      400,
    )
  }

  const customerWilaya = canonicalWilaya(input.customerWilaya)
  if (!customerWilaya) {
    throw new CustomError('VALIDATION_ERROR', 'Please select a wilaya.', 400)
  }

  if (input.fulfillmentType === FulfillmentType.DELIVERY) {
    if (!input.deliveryAddress?.trim() && !customerWilaya) {
      throw new CustomError('VALIDATION_ERROR', 'Delivery address and city required', 400)
    }
  }

  const products = await Promise.all(
    input.lines.map(async (line) => {
      if (!Number.isInteger(line.quantity) || line.quantity < 1) {
        throw new CustomError('VALIDATION_ERROR', 'Quantity must be a positive integer', 400)
      }

      const product = await prisma.product.findUnique({
        where: { id: line.productId },
        include: { family: true },
      })
      if (
        !product ||
        !product.isActive ||
        !product.availableOnline ||
        (product.family && (!product.family.isActive || !product.family.availableOnline))
      ) {
        throw new CustomError('PRODUCT_NOT_FOUND', 'Product unavailable', 404)
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
    name: customerName,
    phone: customerPhone,
    email: input.customerEmail,
    address: customerWilaya,
    password: input.password,
    authenticatedCustomerId: input.authenticatedCustomerId,
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
        customerName,
        customerPhone,
        customerWilaya,
        customerEmail: input.customerEmail ?? null,
        deliveryAddress: input.deliveryAddress ?? null,
        deliveryCity: input.deliveryCity?.trim() || customerWilaya,
        paymentMethod:
          input.fulfillmentType === FulfillmentType.DELIVERY
            ? OnlinePaymentMethod.COD
            : OnlinePaymentMethod.PAY_ON_PICKUP,
        clientId: client.id,
        subtotal,
        deliveryFee,
        total,
        lines: {
          create: products.map(({ product, quantity }) => ({
            productId: product.id,
            quantity,
            unitCost: product.unitCost,
            unitPrice: product.sellPrice,
            lineTotal: product.sellPrice.mul(quantity),
          })),
        },
      },
      include: {
        lines: { include: orderProductInclude },
      },
    })
  })
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

  const mapped = stock
    .filter((s) => shop.outOfStockDisplay === OutOfStockDisplay.SHOW_UNAVAILABLE || s.quantity > 0)
    .map((s) => {
      const family = withFamily(s.product)
      return {
        productId: s.productId,
        name: s.product.name,
        description: s.product.description,
        sellPrice: s.product.sellPrice.toString(),
        inStock: s.quantity > 0,
        quantity: s.quantity,
        category: family.category,
        variantLabel: family.variantLabel,
      }
    })

  const familiesWithStock = new Set(
    stock.filter((s) => s.quantity > 0).map((s) => withFamily(s.product).category),
  )
  return mapped.filter((item) => familiesWithStock.has(item.category ?? ''))
}

export async function checkout(slug: string, input: CheckoutInput) {
  const shop = await prisma.shop.findUnique({ where: { slug } })
  if (!shop) {
    throw new CustomError('SHOP_NOT_FOUND', 'Shop not found', 404)
  }

  const order = await checkoutForShop(shop, input)
  const customer = order.clientId
    ? await prisma.client.findUnique({
        where: { id: order.clientId },
        include: { customer: true },
      }).then((row) => row?.customer ?? null)
    : null

  return { order, customer }
}

export async function listOrders(
  staff: AuthenticatedStaff,
  shopId: string,
  filters?: { status?: OrderStatus; search?: string; wilaya?: string },
) {
  assertShopAccess(staff, shopId)

  const where: Prisma.OnlineOrderWhereInput = {
    shopId,
    ...(filters?.status ? { status: filters.status } : {}),
    ...(filters?.wilaya ? { customerWilaya: filters.wilaya } : {}),
  }

  if (filters?.search?.trim()) {
    const q = filters.search.trim()
    where.OR = [
      { orderNumber: { contains: q, mode: 'insensitive' } },
      { id: { equals: q } },
      { customerName: { contains: q, mode: 'insensitive' } },
      { customerPhone: { contains: q, mode: 'insensitive' } },
      { customerEmail: { contains: q, mode: 'insensitive' } },
      { customerWilaya: { contains: q, mode: 'insensitive' } },
    ]
  }

  return prisma.onlineOrder.findMany({
    where,
    include: {
      lines: { include: orderProductInclude },
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
      lines: { include: orderProductInclude },
      client: { select: { id: true, name: true, phone: true, balance: true, creditLimit: true } },
      fulfillmentSale: true,
    },
  })

  if (!order) {
    throw new CustomError('ORDER_NOT_FOUND', 'Order not found', 404)
  }

  return order
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

  if (status === OrderStatus.CANCELLED) {
    return cancelOrder(staff, shopId, orderId, 'Staff cancelled')
  }

  if (!canTransitionOrderStatus(order.status, status)) {
    throw new CustomError('INVALID_TRANSITION', `Cannot transition from ${order.status} to ${status}`, 400)
  }

  return prisma.onlineOrder.update({
    where: { id: orderId },
    data: { status },
    include: { lines: { include: orderProductInclude }, client: true },
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

  const allowedStatuses: OrderStatus[] = [OrderStatus.READY_FOR_PICKUP, OrderStatus.OUT_FOR_DELIVERY]
  if (!allowedStatuses.includes(order.status)) {
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
            unitCost: line.unitCost,
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
        lines: { include: orderProductInclude },
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
      include: { lines: { include: orderProductInclude } },
    })
  })
}

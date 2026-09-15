import { OnlineOrder, OnlineOrderLine, Product, ProductFamily } from '@prisma/client'
import { withFamily } from '../../shared/products/withFamily.js'
import {
  attributesFromUnknown,
  displayVariantLabel,
} from '../../shared/products/variantAttributes.js'

type OrderLineWithProduct = OnlineOrderLine & {
  product: Product & { family?: ProductFamily | null }
}

type OrderWithLines = OnlineOrder & {
  lines: OrderLineWithProduct[]
  client?: { id: string; name: string; phone: string; balance?: unknown; creditLimit?: unknown } | null
}

function money(value: { toString(): string } | string | number | null | undefined): string {
  if (value === null || value === undefined) return '0'
  return typeof value === 'string' ? value : value.toString()
}

export function orderLinePresenter(line: OrderLineWithProduct) {
  const family = withFamily(line.product)
  const attributes = attributesFromUnknown(line.product.attributes)
  return {
    id: line.id,
    productId: line.productId,
    familyId: line.product.familyId ?? line.product.family?.id ?? null,
    productName: line.product.family?.name ?? family.category,
    variantLabel: displayVariantLabel(attributes, line.product.variantLabel ?? family.variantLabel),
    attributes,
    quantity: line.quantity,
    unitPrice: money(line.unitPrice),
    lineTotal: money(line.lineTotal),
  }
}

export function orderPresenter(order: OrderWithLines) {
  return {
    id: order.id,
    shopId: order.shopId,
    orderNumber: order.orderNumber,
    status: order.status,
    fulfillmentType: order.fulfillmentType,
    customerName: order.customerName,
    customerPhone: order.customerPhone,
    customerWilaya: order.customerWilaya,
    customerEmail: order.customerEmail,
    deliveryAddress: order.deliveryAddress,
    deliveryCity: order.deliveryCity,
    paymentMethod: order.paymentMethod,
    subtotal: money(order.subtotal),
    deliveryFee: money(order.deliveryFee),
    total: money(order.total),
    createdAt: order.createdAt,
    client: order.client
      ? {
          id: order.client.id,
          name: order.client.name,
          phone: order.client.phone,
          balance: order.client.balance !== undefined ? money(order.client.balance as { toString(): string }) : undefined,
          creditLimit:
            order.client.creditLimit !== undefined && order.client.creditLimit !== null
              ? money(order.client.creditLimit as { toString(): string })
              : null,
        }
      : null,
    lines: order.lines.map(orderLinePresenter),
  }
}

import { Customer } from '@prisma/client'
import { orderLinePresenter } from '../storefront/presenter.js'
import { OnlineOrder, OnlineOrderLine, Product, ProductFamily, ProductImage, Shop } from '@prisma/client'

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

export type CustomerOrderRecord = OnlineOrder & {
  shop: Pick<Shop, 'id' | 'name' | 'slug'>
  lines: CustomerOrderLine[]
}

function money(value: { toString(): string } | string | number | null | undefined): string {
  if (value === null || value === undefined) return '0'
  return typeof value === 'string' ? value : value.toString()
}

/** Public order shape for the client space — no staff-only credit fields. */
export function customerOrderPresenter(order: CustomerOrderRecord) {
  return {
    id: order.id,
    orderNumber: order.orderNumber,
    status: order.status,
    fulfillmentType: order.fulfillmentType,
    paymentMethod: order.paymentMethod,
    customerName: order.customerName,
    customerPhone: order.customerPhone,
    customerWilaya: order.customerWilaya,
    subtotal: money(order.subtotal),
    deliveryFee: money(order.deliveryFee),
    total: money(order.total),
    createdAt: order.createdAt,
    shop: {
      id: order.shop.id,
      name: order.shop.name,
      slug: order.shop.slug,
    },
    lines: order.lines.map(orderLinePresenter),
  }
}

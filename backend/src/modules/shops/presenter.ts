import { Shop } from '@prisma/client'
import { ShopResponse } from './types.js'

export function shopPresenter(shop: Shop): ShopResponse {
  return {
    id: shop.id,
    name: shop.name,
    slug: shop.slug,
    address: shop.address,
    contactPhone: shop.contactPhone,
    serviceCity: shop.serviceCity,
    deliveryFee: shop.deliveryFee.toString(),
    outOfStockDisplay: shop.outOfStockDisplay,
    creditReminderDays: shop.creditReminderDays,
    createdAt: shop.createdAt,
    updatedAt: shop.updatedAt,
  }
}

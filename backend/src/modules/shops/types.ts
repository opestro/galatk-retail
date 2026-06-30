import { OutOfStockDisplay } from '@prisma/client'

export interface CreateShopInput {
  name: string
  slug: string
  address: string
  contactPhone?: string
  serviceCity: string
  deliveryFee: number
  outOfStockDisplay?: OutOfStockDisplay
  creditReminderDays?: number
}

export interface UpdateShopInput {
  name?: string
  address?: string
  contactPhone?: string
  serviceCity?: string
  deliveryFee?: number
  outOfStockDisplay?: OutOfStockDisplay
  creditReminderDays?: number
}

export interface ShopResponse {
  id: string
  name: string
  slug: string
  address: string
  contactPhone: string | null
  serviceCity: string
  deliveryFee: string
  outOfStockDisplay: OutOfStockDisplay
  creditReminderDays: number
  createdAt: Date
  updatedAt: Date
}

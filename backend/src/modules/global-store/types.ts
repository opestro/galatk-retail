import { FulfillmentType } from '@prisma/client'

export interface GlobalCheckoutLineInput {
  productId: string
  shopId: string
  quantity: number
}

export interface GlobalCheckoutInput {
  fulfillmentType: FulfillmentType
  customerName: string
  customerPhone: string
  customerEmail?: string
  deliveryAddress?: string
  deliveryCity?: string
  lines: GlobalCheckoutLineInput[]
}

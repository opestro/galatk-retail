import { Request, Response, NextFunction } from 'express'
import * as StorefrontService from './service.js'
import { FulfillmentType } from '@prisma/client'

export async function getShop(req: Request, res: Response, next: NextFunction) {
  try {
    const slug = String(req.params.shopSlug)
    const shop = await StorefrontService.getPublicShopInfo(slug)
    res.status(200).json({ data: shop })
  } catch (error) {
    next(error)
  }
}

export async function listProducts(req: Request, res: Response, next: NextFunction) {
  try {
    const slug = String(req.params.shopSlug)
    const products = await StorefrontService.listStorefrontProducts(slug)
    res.status(200).json({ data: products })
  } catch (error) {
    next(error)
  }
}

export async function checkout(req: Request, res: Response, next: NextFunction) {
  try {
    const slug = String(req.params.shopSlug)
    const {
      fulfillmentType,
      customerName,
      customerPhone,
      customerEmail,
      deliveryAddress,
      deliveryCity,
      lines,
    } = req.body

    const order = await StorefrontService.checkout(slug, {
      fulfillmentType: fulfillmentType as FulfillmentType,
      customerName,
      customerPhone,
      customerEmail,
      deliveryAddress,
      deliveryCity,
      lines,
    })

    res.status(201).json({
      orderId: order.id,
      orderNumber: order.orderNumber,
      total: order.total.toString(),
      status: order.status,
    })
  } catch (error) {
    next(error)
  }
}

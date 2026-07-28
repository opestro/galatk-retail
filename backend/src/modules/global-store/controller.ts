import { Request, Response, NextFunction } from 'express'
import * as GlobalStoreService from './service.js'
import { FulfillmentType } from '@prisma/client'

export async function listShops(_req: Request, res: Response, next: NextFunction) {
  try {
    const shops = await GlobalStoreService.listGlobalShops()
    res.status(200).json({ data: shops })
  } catch (error) {
    next(error)
  }
}

export async function listProducts(_req: Request, res: Response, next: NextFunction) {
  try {
    const products = await GlobalStoreService.listGlobalProducts()
    res.status(200).json({ data: products })
  } catch (error) {
    next(error)
  }
}

export async function lookupCustomer(req: Request, res: Response, next: NextFunction) {
  try {
    const phone = String(req.query.phone ?? '')
    const customer = await GlobalStoreService.lookupCustomerByPhone(phone)
    res.status(200).json({ data: customer })
  } catch (error) {
    next(error)
  }
}

export async function checkout(req: Request, res: Response, next: NextFunction) {
  try {
    const {
      fulfillmentType,
      customerName,
      customerPhone,
      customerEmail,
      deliveryAddress,
      deliveryCity,
      lines,
    } = req.body

    const orders = await GlobalStoreService.globalCheckout({
      fulfillmentType: fulfillmentType as FulfillmentType,
      customerName,
      customerPhone,
      customerEmail,
      deliveryAddress,
      deliveryCity,
      lines,
    })

    res.status(201).json({
      orders: orders.map((order) => ({
        orderId: order.id,
        shopId: order.shopId,
        orderNumber: order.orderNumber,
        total: order.total.toString(),
        status: order.status,
      })),
    })
  } catch (error) {
    next(error)
  }
}

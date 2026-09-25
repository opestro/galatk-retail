import { Request, Response, NextFunction } from 'express'
import * as GlobalStoreService from './service.js'
import { FulfillmentType } from '@prisma/client'
import * as SettingsController from '../settings/controller.js'
import { issueCustomerSession } from '../account/service.js'

/** Public homepage hero — same payload admins edit under /settings. */
export async function getBanner(req: Request, res: Response, next: NextFunction) {
  return SettingsController.getPublic(req, res, next)
}

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

export async function getProduct(req: Request, res: Response, next: NextFunction) {
  try {
    const idOrSlug = String(req.params.productId ?? '')
    const product = await GlobalStoreService.getGlobalProduct(idOrSlug)
    res.status(200).json({ data: product })
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
      customerWilaya,
      customerEmail,
      deliveryAddress,
      deliveryCity,
      password,
      lines,
    } = req.body

    const { orders, customer } = await GlobalStoreService.globalCheckout({
      fulfillmentType: (fulfillmentType as FulfillmentType) || FulfillmentType.PICKUP,
      customerName,
      customerPhone,
      customerWilaya,
      customerEmail,
      deliveryAddress,
      deliveryCity,
      password,
      authenticatedCustomerId: req.customer?.id,
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
      account: issueCustomerSession(customer),
    })
  } catch (error) {
    next(error)
  }
}

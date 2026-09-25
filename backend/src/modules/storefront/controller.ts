import { Request, Response, NextFunction } from 'express'
import * as StorefrontService from './service.js'
import { FulfillmentType } from '@prisma/client'
import { lookupCustomerByPhone } from '../../shared/clients/upsertFromOnline.js'
import { issueCustomerSession } from '../account/service.js'
import { CustomError } from '../../shared/types/error_type.js'

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

export async function lookupCustomer(req: Request, res: Response, next: NextFunction) {
  try {
    const phone = String(req.query.phone ?? '')
    const customer = await lookupCustomerByPhone(phone)
    res.status(200).json({ data: customer })
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
      customerWilaya,
      customerEmail,
      deliveryAddress,
      deliveryCity,
      password,
      lines,
    } = req.body

    const { order, customer } = await StorefrontService.checkout(slug, {
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

    if (!customer) {
      throw new CustomError('CHECKOUT_FAILED', 'Could not create your account.', 500)
    }

    res.status(201).json({
      orderId: order.id,
      orderNumber: order.orderNumber,
      total: order.total.toString(),
      status: order.status,
      account: issueCustomerSession(customer),
    })
  } catch (error) {
    next(error)
  }
}

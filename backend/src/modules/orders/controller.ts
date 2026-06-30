import { Request, Response, NextFunction } from 'express'
import * as StorefrontService from '../storefront/service.js'
import { OrderStatus } from '@prisma/client'

export async function list(req: Request, res: Response, next: NextFunction) {
  try {
    const shopId = String(req.params.shopId)
    const status = typeof req.query.status === 'string' ? (req.query.status as OrderStatus) : undefined
    const orders = await StorefrontService.listOrders(req.staff!, shopId, status)
    res.status(200).json({ data: orders })
  } catch (error) {
    next(error)
  }
}

export async function getById(req: Request, res: Response, next: NextFunction) {
  try {
    const shopId = String(req.params.shopId)
    const orderId = String(req.params.orderId)
    const order = await StorefrontService.getOrderById(req.staff!, shopId, orderId)
    res.status(200).json({ data: order })
  } catch (error) {
    next(error)
  }
}

export async function updateStatus(req: Request, res: Response, next: NextFunction) {
  try {
    const shopId = String(req.params.shopId)
    const orderId = String(req.params.orderId)
    const { status } = req.body

    const order = await StorefrontService.updateOrderStatus(
      req.staff!,
      shopId,
      orderId,
      status as OrderStatus,
    )
    res.status(200).json({ data: order })
  } catch (error) {
    next(error)
  }
}

export async function complete(req: Request, res: Response, next: NextFunction) {
  try {
    const shopId = String(req.params.shopId)
    const orderId = String(req.params.orderId)
    const { paymentMethod, amountPaid, payLater, creditLimitOverride } = req.body

    const order = await StorefrontService.completeOnlineOrder(req.staff!, shopId, orderId, {
      paymentMethod,
      amountPaid,
      payLater,
      creditLimitOverride,
    })
    res.status(200).json({ data: order })
  } catch (error) {
    next(error)
  }
}

export async function cancel(req: Request, res: Response, next: NextFunction) {
  try {
    const shopId = String(req.params.shopId)
    const orderId = String(req.params.orderId)
    const { reason } = req.body

    const order = await StorefrontService.cancelOrder(req.staff!, shopId, orderId, reason)
    res.status(200).json({ data: order })
  } catch (error) {
    next(error)
  }
}

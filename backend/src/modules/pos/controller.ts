import { Request, Response, NextFunction } from 'express'
import * as PosService from './service.js'
import { PaymentMethod } from '@prisma/client'

export async function listProducts(req: Request, res: Response, next: NextFunction) {
  try {
    const shopId = String(req.params.shopId)
    const products = await PosService.listPosProducts(req.staff!, shopId)
    res.status(200).json({ data: products })
  } catch (error) {
    next(error)
  }
}

export async function createSale(req: Request, res: Response, next: NextFunction) {
  try {
    const shopId = String(req.params.shopId)
    const { lines, paymentMethod, clientId, amountPaid, payLater, creditLimitOverride } = req.body

    const sale = await PosService.createSale(req.staff!, shopId, {
      lines,
      paymentMethod: paymentMethod as PaymentMethod,
      clientId,
      amountPaid,
      payLater,
      creditLimitOverride,
    })

    res.status(201).json({ data: sale })
  } catch (error) {
    next(error)
  }
}

export async function listSales(req: Request, res: Response, next: NextFunction) {
  try {
    const shopId = String(req.params.shopId)
    const date = typeof req.query.date === 'string' ? req.query.date : undefined
    const sales = await PosService.listSales(req.staff!, shopId, date)
    res.status(200).json({ data: sales })
  } catch (error) {
    next(error)
  }
}

export async function getSale(req: Request, res: Response, next: NextFunction) {
  try {
    const shopId = String(req.params.shopId)
    const saleId = String(req.params.saleId)
    const sale = await PosService.getSaleById(req.staff!, shopId, saleId)
    res.status(200).json({ data: sale })
  } catch (error) {
    next(error)
  }
}

export async function voidSale(req: Request, res: Response, next: NextFunction) {
  try {
    const shopId = String(req.params.shopId)
    const saleId = String(req.params.saleId)
    const { reason } = req.body

    const sale = await PosService.voidSale(req.staff!, shopId, saleId, reason)
    res.status(200).json({ data: sale })
  } catch (error) {
    next(error)
  }
}

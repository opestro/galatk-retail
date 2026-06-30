import { Request, Response, NextFunction } from 'express'
import * as ChargesService from './service.js'

export async function list(req: Request, res: Response, next: NextFunction) {
  try {
    const shopId = String(req.params.shopId)
    const from = typeof req.query.from === 'string' ? req.query.from : undefined
    const to = typeof req.query.to === 'string' ? req.query.to : undefined

    const charges = await ChargesService.listCharges(req.staff!, shopId, from, to)
    res.status(200).json({ data: charges })
  } catch (error) {
    next(error)
  }
}

export async function create(req: Request, res: Response, next: NextFunction) {
  try {
    const shopId = String(req.params.shopId)
    const charge = await ChargesService.createCharge(req.staff!, shopId, req.body)
    res.status(201).json({ data: charge })
  } catch (error) {
    next(error)
  }
}

export async function voidCharge(req: Request, res: Response, next: NextFunction) {
  try {
    const shopId = String(req.params.shopId)
    const chargeId = String(req.params.chargeId)
    const { reason } = req.body

    const charge = await ChargesService.voidCharge(req.staff!, shopId, chargeId, reason)
    res.status(200).json({ data: charge })
  } catch (error) {
    next(error)
  }
}

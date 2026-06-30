import { Request, Response, NextFunction } from 'express'
import * as DashboardService from './service.js'

export async function summary(req: Request, res: Response, next: NextFunction) {
  try {
    const shopId = String(req.params.shopId)
    const data = await DashboardService.getShopSummary(req.staff!, shopId)
    res.status(200).json({ data })
  } catch (error) {
    next(error)
  }
}

export async function financialSummary(req: Request, res: Response, next: NextFunction) {
  try {
    const shopId = String(req.params.shopId)
    const from = typeof req.query.from === 'string' ? req.query.from : undefined
    const to = typeof req.query.to === 'string' ? req.query.to : undefined
    const data = await DashboardService.getFinancialSummary(req.staff!, shopId, from, to)
    res.status(200).json({ data })
  } catch (error) {
    next(error)
  }
}

export async function networkSummary(req: Request, res: Response, next: NextFunction) {
  try {
    const data = await DashboardService.getNetworkSummary(req.staff!)
    res.status(200).json({ data })
  } catch (error) {
    next(error)
  }
}

export async function networkFinancialSummary(req: Request, res: Response, next: NextFunction) {
  try {
    const from = typeof req.query.from === 'string' ? req.query.from : undefined
    const to = typeof req.query.to === 'string' ? req.query.to : undefined
    const data = await DashboardService.getNetworkFinancialSummary(req.staff!, from, to)
    res.status(200).json({ data })
  } catch (error) {
    next(error)
  }
}

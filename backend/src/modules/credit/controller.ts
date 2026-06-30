import { Request, Response, NextFunction } from 'express'
import * as CreditService from './service.js'
import { PaymentMethod } from '@prisma/client'

export async function recordPayment(req: Request, res: Response, next: NextFunction) {
  try {
    const shopId = String(req.params.shopId)
    const clientId = String(req.params.clientId)
    const { amount, paymentMethod } = req.body

    const payment = await CreditService.recordPayment(req.staff!, shopId, clientId, {
      amount,
      paymentMethod: paymentMethod as PaymentMethod,
    })

    res.status(201).json({ data: payment })
  } catch (error) {
    next(error)
  }
}

export async function voidPayment(req: Request, res: Response, next: NextFunction) {
  try {
    const shopId = String(req.params.shopId)
    const clientId = String(req.params.clientId)
    const paymentId = String(req.params.paymentId)
    const { reason } = req.body

    const payment = await CreditService.voidPayment(
      req.staff!,
      shopId,
      clientId,
      paymentId,
      reason,
    )

    res.status(200).json({ data: payment })
  } catch (error) {
    next(error)
  }
}

export async function dashboard(req: Request, res: Response, next: NextFunction) {
  try {
    const shopId = String(req.params.shopId)
    const data = await CreditService.getCreditDashboard(req.staff!, shopId)
    res.status(200).json({ data })
  } catch (error) {
    next(error)
  }
}

export async function reminders(req: Request, res: Response, next: NextFunction) {
  try {
    const shopId = String(req.params.shopId)
    const data = await CreditService.getCreditReminders(req.staff!, shopId)
    res.status(200).json({ data })
  } catch (error) {
    next(error)
  }
}

export async function logReminderContact(req: Request, res: Response, next: NextFunction) {
  try {
    const clientId = String(req.params.clientId)
    const contact = await CreditService.logReminderContact(req.staff!, clientId, req.body)
    res.status(201).json({ data: contact })
  } catch (error) {
    next(error)
  }
}

export async function createAdjustment(req: Request, res: Response, next: NextFunction) {
  try {
    const clientId = String(req.params.clientId)
    const client = await CreditService.createAdjustment(req.staff!, clientId, req.body)
    res.status(201).json({ data: client })
  } catch (error) {
    next(error)
  }
}

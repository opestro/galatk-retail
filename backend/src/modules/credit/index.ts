import { Router } from 'express'
import * as CreditController from './controller.js'
import { requireAuth } from '../../shared/middlewares/requireAuth.js'

const shopCreditRouter = Router({ mergeParams: true })
shopCreditRouter.use(requireAuth)
shopCreditRouter.get('/dashboard', CreditController.dashboard)
shopCreditRouter.get('/reminders', CreditController.reminders)

const paymentsRouter = Router({ mergeParams: true })
paymentsRouter.use(requireAuth)
paymentsRouter.post('/', CreditController.recordPayment)
paymentsRouter.post('/:paymentId/void', CreditController.voidPayment)

const clientCreditRouter = Router()
clientCreditRouter.use(requireAuth)
clientCreditRouter.post('/:clientId/reminder-contacts', CreditController.logReminderContact)
clientCreditRouter.post('/:clientId/adjustments', CreditController.createAdjustment)

export { shopCreditRouter, paymentsRouter, clientCreditRouter }

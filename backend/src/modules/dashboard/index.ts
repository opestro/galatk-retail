import { Router } from 'express'
import * as DashboardController from './controller.js'
import { requireAuth } from '../../shared/middlewares/requireAuth.js'

const shopRouter = Router({ mergeParams: true })
shopRouter.use(requireAuth)
shopRouter.get('/summary', DashboardController.summary)
shopRouter.get('/financial-summary', DashboardController.financialSummary)

const networkRouter = Router()
networkRouter.use(requireAuth)
networkRouter.get('/network', DashboardController.networkSummary)
networkRouter.get('/network-financial-summary', DashboardController.networkFinancialSummary)

export { shopRouter, networkRouter }

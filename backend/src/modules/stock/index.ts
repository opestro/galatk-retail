import { Router } from 'express'
import * as StockController from './controller.js'
import { requireAuth } from '../../shared/middlewares/requireAuth.js'

const router = Router({ mergeParams: true })

router.use(requireAuth)

router.get('/stock', StockController.listStock)
router.post('/inbound-transfers', StockController.createInboundTransfer)
router.get('/inbound-transfers', StockController.listInboundTransfers)

export default router

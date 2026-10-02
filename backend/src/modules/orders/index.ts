import { Router } from 'express'
import * as OrdersController from './controller.js'
import { requireAuth } from '../../shared/middlewares/requireAuth.js'

const router = Router({ mergeParams: true })

router.use(requireAuth)

router.get('/', OrdersController.list)
router.post('/:orderId/lines', OrdersController.addLine)
router.delete('/:orderId/lines/:lineId', OrdersController.removeLine)
router.get('/:orderId', OrdersController.getById)
router.patch('/:orderId/status', OrdersController.updateStatus)
router.post('/:orderId/complete', OrdersController.complete)
router.post('/:orderId/cancel', OrdersController.cancel)

export default router

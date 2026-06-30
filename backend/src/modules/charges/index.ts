import { Router } from 'express'
import * as ChargesController from './controller.js'
import { requireAuth } from '../../shared/middlewares/requireAuth.js'

const router = Router({ mergeParams: true })

router.use(requireAuth)
router.get('/', ChargesController.list)
router.post('/', ChargesController.create)
router.post('/:chargeId/void', ChargesController.voidCharge)

export default router

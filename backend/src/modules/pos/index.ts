import { Router } from 'express'
import * as PosController from './controller.js'
import { requireAuth } from '../../shared/middlewares/requireAuth.js'

const router = Router({ mergeParams: true })

router.use(requireAuth)

router.get('/products', PosController.listProducts)
router.post('/sales', PosController.createSale)
router.get('/sales', PosController.listSales)
router.get('/sales/:saleId', PosController.getSale)
router.post('/sales/:saleId/void', PosController.voidSale)

export default router

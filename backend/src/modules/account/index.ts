import { Router } from 'express'
import * as AccountController from './controller.js'
import { requireCustomerAuth } from '../../shared/middlewares/requireCustomerAuth.js'

const router = Router()

router.post('/login', AccountController.login)
router.post('/register', AccountController.register)
router.get('/me', requireCustomerAuth, AccountController.me)
router.get('/credit', requireCustomerAuth, AccountController.getCredit)
router.get('/orders', requireCustomerAuth, AccountController.listOrders)
router.get('/orders/:orderId', requireCustomerAuth, AccountController.getOrder)
router.get('/sales', requireCustomerAuth, AccountController.listSales)
router.get('/sales/:saleId', requireCustomerAuth, AccountController.getSale)

export default router

import { Router } from 'express'
import * as AccountController from './controller.js'
import { requireCustomerAuth } from '../../shared/middlewares/requireCustomerAuth.js'

const router = Router()

router.post('/login', AccountController.login)
router.post('/register', AccountController.register)
router.get('/me', requireCustomerAuth, AccountController.me)
router.get('/orders', requireCustomerAuth, AccountController.listOrders)
router.get('/orders/:orderId', requireCustomerAuth, AccountController.getOrder)

export default router

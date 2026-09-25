import { Router } from 'express'
import * as GlobalStoreController from './controller.js'
import { optionalCustomerAuth } from '../../shared/middlewares/requireCustomerAuth.js'

const router = Router()

router.get('/shops', GlobalStoreController.listShops)
router.get('/banner', GlobalStoreController.getBanner)
router.get('/products', GlobalStoreController.listProducts)
router.get('/products/:productId', GlobalStoreController.getProduct)
router.get('/customer-lookup', GlobalStoreController.lookupCustomer)
router.post('/checkout', optionalCustomerAuth, GlobalStoreController.checkout)

export default router

import { Router } from 'express'
import * as GlobalStoreController from './controller.js'

const router = Router()

router.get('/shops', GlobalStoreController.listShops)
router.get('/products', GlobalStoreController.listProducts)
router.get('/customer-lookup', GlobalStoreController.lookupCustomer)
router.post('/checkout', GlobalStoreController.checkout)

export default router

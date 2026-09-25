import { Router } from 'express'
import * as StorefrontController from './controller.js'
import { optionalCustomerAuth } from '../../shared/middlewares/requireCustomerAuth.js'

const router = Router()

router.get('/:shopSlug', StorefrontController.getShop)
router.get('/:shopSlug/products', StorefrontController.listProducts)
router.get('/:shopSlug/customer-lookup', StorefrontController.lookupCustomer)
router.post('/:shopSlug/checkout', optionalCustomerAuth, StorefrontController.checkout)

export default router

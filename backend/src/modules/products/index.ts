import { Router } from 'express'
import * as ProductsController from './controller.js'
import { requireAuth, requireRoles } from '../../shared/middlewares/requireAuth.js'
import { StaffRole } from '@prisma/client'

const router = Router()

router.use(requireAuth)
router.use(requireRoles(StaffRole.OWNER, StaffRole.MANAGER))

router.get('/', ProductsController.list)
router.post('/', ProductsController.create)
router.get('/:productId', ProductsController.getById)
router.patch('/:productId', ProductsController.update)

export default router

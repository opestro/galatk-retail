import { Router } from 'express'
import * as ShopsController from './controller.js'
import { requireAuth, requirePermissionMw } from '../../shared/middlewares/requireAuth.js'
import { StaffPermission } from '@prisma/client'

const router = Router()

const managerOnly = requirePermissionMw(StaffPermission.SHOPS_MANAGE)

router.use(requireAuth)

router.get('/', managerOnly, ShopsController.list)
router.post('/', managerOnly, ShopsController.create)
router.get('/:shopId', managerOnly, ShopsController.getById)
router.patch('/:shopId', managerOnly, ShopsController.update)

export default router

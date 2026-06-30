import { Router } from 'express'
import * as ShopsController from './controller.js'
import { requireAuth, requireRoles } from '../../shared/middlewares/requireAuth.js'
import { StaffRole } from '@prisma/client'

const router = Router()

const managerOnly = requireRoles(StaffRole.OWNER, StaffRole.MANAGER)

router.use(requireAuth)

router.get('/', managerOnly, ShopsController.list)
router.post('/', managerOnly, ShopsController.create)
router.get('/:shopId', managerOnly, ShopsController.getById)
router.patch('/:shopId', managerOnly, ShopsController.update)

export default router

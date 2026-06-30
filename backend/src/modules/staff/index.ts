import { Router } from 'express'
import * as StaffController from './controller.js'
import { requireAuth, requireRoles } from '../../shared/middlewares/requireAuth.js'
import { StaffRole } from '@prisma/client'

const router = Router()

router.use(requireAuth)
router.use(requireRoles(StaffRole.OWNER, StaffRole.MANAGER))

router.get('/', StaffController.list)
router.post('/', StaffController.create)
router.patch('/:staffId', StaffController.update)

export default router

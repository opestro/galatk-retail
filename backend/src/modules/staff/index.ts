import { Router } from 'express'
import * as StaffController from './controller.js'
import { requireAuth, requirePermissionMw } from '../../shared/middlewares/requireAuth.js'
import { StaffPermission } from '@prisma/client'

const router = Router()

router.use(requireAuth)
router.use(requirePermissionMw(StaffPermission.STAFF_MANAGE))

router.get('/', StaffController.list)
router.post('/', StaffController.create)
router.patch('/:staffId', StaffController.update)

export default router

import { Router } from 'express'
import { StaffRole } from '@prisma/client'
import * as RolesController from './controller.js'
import { requireAuth, requireRoles } from '../../shared/middlewares/requireAuth.js'

const router = Router()
// Deciding who can do what is the owner's call alone.
router.use(requireAuth)
router.use(requireRoles(StaffRole.OWNER))

router.get('/', RolesController.list)
router.post('/groups', RolesController.createGroup)
router.patch('/groups/:groupId', RolesController.updateGroup)
router.delete('/groups/:groupId', RolesController.deleteGroup)
router.put('/:role', RolesController.update)

export default router

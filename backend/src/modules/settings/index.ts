import { Router } from 'express'
import { StaffRole } from '@prisma/client'
import { requireAuth, requireRoles } from '../../shared/middlewares/requireAuth.js'
import * as SettingsController from './controller.js'

const router = Router()

router.use(requireAuth)
router.use(requireRoles(StaffRole.OWNER, StaffRole.MANAGER))

router.get('/', SettingsController.getAdmin)
router.patch('/', SettingsController.update)
router.post('/banner-image', SettingsController.uploadBannerImage, SettingsController.uploadImage)
router.delete('/banner-image/:imageId', SettingsController.removeImage)

export default router

import { Router } from 'express'
import { StaffPermission } from '@prisma/client'
import { requireAuth, requirePermissionMw } from '../../shared/middlewares/requireAuth.js'
import * as SettingsController from './controller.js'

const router = Router()

router.use(requireAuth)
router.use(requirePermissionMw(StaffPermission.SETTINGS_MANAGE))

router.get('/', SettingsController.getAdmin)
router.patch('/', SettingsController.update)
router.post('/banner-image', SettingsController.uploadBannerImage, SettingsController.uploadImage)
router.delete('/banner-image/:imageId', SettingsController.removeImage)
router.get('/delivery-rates', SettingsController.getDeliveryRates)
router.put('/delivery-rates', SettingsController.updateDeliveryRates)
router.post('/reset', SettingsController.resetAll)

export default router

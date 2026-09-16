import { Router } from 'express'
import * as ProductsController from './controller.js'
import { requireAuth, requireRoles } from '../../shared/middlewares/requireAuth.js'
import { StaffRole } from '@prisma/client'

const router = Router()

router.use(requireAuth)
router.use(requireRoles(StaffRole.OWNER, StaffRole.MANAGER))

router.get('/', ProductsController.list)
router.post('/', ProductsController.create)
router.get('/families', ProductsController.listFamilies)
router.post('/families', ProductsController.createFamily)
router.get('/families/:familyId', ProductsController.getFamily)
router.patch('/families/:familyId', ProductsController.updateFamily)
router.post('/families/:familyId/variants', ProductsController.addVariant)
router.post(
  '/families/:familyId/images',
  ProductsController.uploadFamilyImage,
  ProductsController.addImage,
)
router.delete('/families/:familyId/images/:imageId', ProductsController.removeImage)
router.patch('/families/:familyId/images/:imageId/primary', ProductsController.setPrimaryImage)
router.get('/:productId', ProductsController.getById)
router.patch('/:productId', ProductsController.update)
router.patch('/:productId/stock', ProductsController.setStock)
router.delete('/:productId', ProductsController.remove)

export default router

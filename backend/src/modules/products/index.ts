import { Router } from 'express'
import * as ProductsController from './controller.js'
import { requireAuth, requirePermissionMw } from '../../shared/middlewares/requireAuth.js'
import { StaffPermission } from '@prisma/client'

const router = Router()

router.use(requireAuth)

const can = requirePermissionMw

router.get('/', can(StaffPermission.PRODUCT_VIEW), ProductsController.list)
router.post('/', can(StaffPermission.PRODUCT_CREATE), ProductsController.create)
router.get('/families', can(StaffPermission.PRODUCT_VIEW), ProductsController.listFamilies)
router.post('/families', can(StaffPermission.PRODUCT_CREATE), ProductsController.createFamily)
router.get('/families/:familyId', can(StaffPermission.PRODUCT_VIEW), ProductsController.getFamily)
router.patch('/families/:familyId', can(StaffPermission.PRODUCT_EDIT), ProductsController.updateFamily)
router.delete('/families/:familyId', can(StaffPermission.PRODUCT_DELETE), ProductsController.removeFamily)
router.post('/families/:familyId/variants', can(StaffPermission.PRODUCT_CREATE), ProductsController.addVariant)
router.post(
  '/families/:familyId/images',
  can(StaffPermission.PRODUCT_CREATE),
  ProductsController.uploadFamilyImage,
  ProductsController.addImage,
)
router.delete('/families/:familyId/images/:imageId', can(StaffPermission.PRODUCT_EDIT), ProductsController.removeImage)
router.patch('/families/:familyId/images/:imageId/primary', can(StaffPermission.PRODUCT_EDIT), ProductsController.setPrimaryImage)
router.get('/:productId', can(StaffPermission.PRODUCT_VIEW), ProductsController.getById)
router.patch('/:productId', ProductsController.guardUpdate, ProductsController.update)
router.patch('/:productId/stock', can(StaffPermission.STOCK_ADJUST), ProductsController.setStock)
router.delete('/:productId', can(StaffPermission.PRODUCT_DELETE), ProductsController.remove)

export default router

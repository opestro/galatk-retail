import { Router } from 'express'
import * as ProductsController from './controller.js'
import { requireAuth, requireRoles, requirePermissionOrManager } from '../../shared/middlewares/requireAuth.js'
import { StaffPermission, StaffRole } from '@prisma/client'

const router = Router()

router.use(requireAuth)

// Cashiers granted MANAGE_CATALOG may browse and add products/variants only;
// editing, stock overrides and deletion stay with owners and managers.
const catalogAccess = requirePermissionOrManager(StaffPermission.MANAGE_CATALOG)
const managersOnly = requireRoles(StaffRole.OWNER, StaffRole.MANAGER)

router.get('/', catalogAccess, ProductsController.list)
router.post('/', catalogAccess, ProductsController.create)
router.get('/families', catalogAccess, ProductsController.listFamilies)
router.post('/families', catalogAccess, ProductsController.createFamily)
router.get('/families/:familyId', catalogAccess, ProductsController.getFamily)
router.patch('/families/:familyId', managersOnly, ProductsController.updateFamily)
router.delete('/families/:familyId', managersOnly, ProductsController.removeFamily)
router.post('/families/:familyId/variants', catalogAccess, ProductsController.addVariant)
router.post(
  '/families/:familyId/images',
  catalogAccess,
  ProductsController.uploadFamilyImage,
  ProductsController.addImage,
)
router.delete('/families/:familyId/images/:imageId', managersOnly, ProductsController.removeImage)
router.patch('/families/:familyId/images/:imageId/primary', managersOnly, ProductsController.setPrimaryImage)
router.get('/:productId', catalogAccess, ProductsController.getById)
router.patch('/:productId', managersOnly, ProductsController.update)
router.patch('/:productId/stock', managersOnly, ProductsController.setStock)
router.delete('/:productId', managersOnly, ProductsController.remove)

export default router

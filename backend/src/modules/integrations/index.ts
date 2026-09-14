import { Router } from 'express'
import * as IntegrationController from './controller.js'
import { requireIntegrationKey } from '../../shared/middlewares/requireIntegrationKey.js'

const router = Router()

router.use(requireIntegrationKey)

router.get('/shops', IntegrationController.listShops)
router.post('/shops/:shopId/inbound-transfers', IntegrationController.createInboundTransfer)
router.post('/sso/issue', IntegrationController.issueSso)

export default router

import { Router } from 'express'
import * as AuthController from './controller.js'
import { requireAuth } from '../../shared/middlewares/requireAuth.js'

const router = Router()

router.post('/login', AuthController.login)
router.post('/sso/exchange', AuthController.exchangeSso)
router.post('/sso/launch-workshop', requireAuth, AuthController.launchWorkshop)
router.get('/me', requireAuth, AuthController.me)

export default router

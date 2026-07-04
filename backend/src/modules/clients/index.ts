import { Router } from 'express'
import * as ClientsController from './controller.js'
import { requireAuth } from '../../shared/middlewares/requireAuth.js'

const shopClientsRouter = Router({ mergeParams: true })
shopClientsRouter.use(requireAuth)
shopClientsRouter.get('/', ClientsController.listByShop)
shopClientsRouter.post('/', ClientsController.create)

const clientRouter = Router()
clientRouter.use(requireAuth)
clientRouter.get('/:clientId', ClientsController.getById)
clientRouter.patch('/:clientId', ClientsController.update)
clientRouter.get('/:clientId/ledger', ClientsController.getLedger)
clientRouter.get('/:clientId/purchases', ClientsController.getPurchases)

export { shopClientsRouter, clientRouter }

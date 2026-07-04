import express from 'express'
import authRoutes from './auth/index.js'
import shopsRoutes from './shops/index.js'
import productsRoutes from './products/index.js'
import stockRoutes from './stock/index.js'
import posRoutes from './pos/index.js'
import ordersRoutes from './orders/index.js'
import storefrontRoutes from './storefront/index.js'
import globalStoreRoutes from './global-store/index.js'
import staffRoutes from './staff/index.js'
import { shopRouter as dashboardShopRouter, networkRouter as dashboardNetworkRouter } from './dashboard/index.js'
import { shopClientsRouter, clientRouter } from './clients/index.js'
import { shopCreditRouter, paymentsRouter, clientCreditRouter } from './credit/index.js'
import chargesRoutes from './charges/index.js'
import integrationsRoutes from './integrations/index.js'

const appRouter = express.Router()

appRouter.get('/health', (_req, res) => {
  res.status(200).send({ status: 'healthy' })
})

const apiV1 = express.Router()

apiV1.use('/auth', authRoutes)
apiV1.use('/shops', shopsRoutes)
apiV1.use('/products', productsRoutes)
apiV1.use('/shops/:shopId', stockRoutes)
apiV1.use('/shops/:shopId/pos', posRoutes)
apiV1.use('/shops/:shopId/orders', ordersRoutes)
apiV1.use('/shops/:shopId/dashboard', dashboardShopRouter)
apiV1.use('/shops/:shopId/clients', shopClientsRouter)
apiV1.use('/shops/:shopId/clients/:clientId/payments', paymentsRouter)
apiV1.use('/shops/:shopId/credit', shopCreditRouter)
apiV1.use('/shops/:shopId/charges', chargesRoutes)
apiV1.use('/clients', clientRouter)
apiV1.use('/clients', clientCreditRouter)
apiV1.use('/storefront', storefrontRoutes)
apiV1.use('/global-store', globalStoreRoutes)
apiV1.use('/staff', staffRoutes)
apiV1.use('/dashboard', dashboardNetworkRouter)
apiV1.use('/integrations', integrationsRoutes)

appRouter.use('/api/v1', apiV1)

export default appRouter

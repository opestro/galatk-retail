import express, { Express } from 'express'
import cors from 'cors'

import AppModules from './modules/index.js'
import { PORT } from './config/global.js'
import { corsOptions } from './config/cors.js'
import { morganLogger } from './shared/middlewares/morgan-logger.js'
import { errorHandler } from './handlers/errorHandler.js'

export function createExpressApp(): Express {
  const server: Express = express()

  // CORS middleware
  server.use(cors(corsOptions))

  // Morgan logger middleware
  server.use(morganLogger)

  // Middleware
  server.use(express.json())
  server.use(express.urlencoded({ extended: true }))

  // Modules
  server.use('/', AppModules)

  // Error handling middleware
  server.use(errorHandler)

  return server
}

export function startServer(app: Express) {
  return app.listen(PORT, () => {
    console.info(`⚡️[server]: Server is running at http://localhost:${PORT}`)
  })
}

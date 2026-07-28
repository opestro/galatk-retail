import fs from 'node:fs'
import path from 'node:path'
import express, { Express, Request } from 'express'
import cors from 'cors'

import AppModules from './modules/index.js'
import { PORT } from './config/global.js'
import { corsOptions } from './config/cors.js'
import { morganLogger } from './shared/middlewares/morgan-logger.js'
import { errorHandler } from './handlers/errorHandler.js'

/**
 * Host for the Vue app (e.g. galatk.shop). API-only host is api.* (e.g. api.galatk.shop).
 * Both can CNAME to the same PivoCloud app; we route by Host header.
 */
function requestHostname(req: Request): string {
  const raw = (req.hostname || req.headers.host || '').toString().toLowerCase()
  return raw.split(':')[0] ?? ''
}

function isApiHostname(hostname: string): boolean {
  if (hostname.startsWith('api.')) {
    return true
  }
  const apiHost = (process.env.API_HOST ?? 'api.galatk.shop').toLowerCase()
  return hostname === apiHost
}

function isWebHostname(hostname: string): boolean {
  if (isApiHostname(hostname)) {
    return false
  }
  const webHost = (process.env.WEB_HOST ?? 'galatk.shop').toLowerCase()
  if (hostname === webHost || hostname === `www.${webHost}`) {
    return true
  }
  // Local / default PivoCloud hostname: serve SPA when not on the API host.
  return !hostname || hostname === 'localhost' || hostname.endsWith('.pivocloud.dz') || hostname.endsWith('.pivocloud.com')
}

export function createExpressApp(): Express {
  const server: Express = express()

  // CORS middleware (browser calls api.* from galatk.shop)
  server.use(cors(corsOptions))

  // Morgan logger middleware
  server.use(morganLogger)

  // Middleware
  server.use(express.json())
  server.use(express.urlencoded({ extended: true }))

  // Modules (/api/v1 + /health) — available on every host
  server.use('/', AppModules)

  // Serve Vue SPA only on the web host (not on api.*)
  const publicDir = path.join(process.cwd(), 'public')
  if (fs.existsSync(publicDir)) {
    server.use((req, res, next) => {
      if (isApiHostname(requestHostname(req))) {
        next()
        return
      }
      if (!isWebHostname(requestHostname(req))) {
        next()
        return
      }
      express.static(publicDir)(req, res, next)
    })

    server.get(/^(?!\/api)(?!\/health).*/, (req, res, next) => {
      const host = requestHostname(req)
      if (isApiHostname(host)) {
        res.status(404).json({
          error: 'Not Found',
          message: 'API host — use /api/v1/... (SPA is on the web domain)',
        })
        return
      }
      if (!isWebHostname(host)) {
        next()
        return
      }
      res.sendFile(path.join(publicDir, 'index.html'))
    })
  }

  // Error handling middleware
  server.use(errorHandler)

  return server
}

export function startServer(app: Express) {
  return app.listen(PORT, () => {
    console.info(`⚡️[server]: Server is running at http://localhost:${PORT}`)
  })
}

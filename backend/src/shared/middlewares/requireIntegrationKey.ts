import { timingSafeEqual } from 'node:crypto'
import { Request, Response, NextFunction } from 'express'
import { CustomError } from '../types/error_type.js'

function safeCompare(a: string, b: string): boolean {
  const bufA = Buffer.from(a)
  const bufB = Buffer.from(b)
  if (bufA.length !== bufB.length) {
    return false
  }
  return timingSafeEqual(bufA, bufB)
}

export function requireIntegrationKey(req: Request, _res: Response, next: NextFunction) {
  const configuredKey = process.env.GALATK_INTEGRATION_API_KEY
  if (!configuredKey) {
    next(new CustomError('INTEGRATION_DISABLED', 'Integration API is not configured', 503))
    return
  }

  const headerKey = req.headers['x-integration-key']
  if (typeof headerKey !== 'string' || !safeCompare(headerKey, configuredKey)) {
    next(new CustomError('UNAUTHORIZED', 'Invalid integration key', 401))
    return
  }

  next()
}

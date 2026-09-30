import { Request, Response, NextFunction } from 'express'
import prisma from '../../resources/database/initDatabase.js'
import { verifyCustomerToken } from '../auth/jwt.js'
import { CustomError } from '../types/error_type.js'

export interface AuthenticatedCustomer {
  id: string
  name: string
  phone: string
  email: string | null
}

declare global {
  namespace Express {
    interface Request {
      customer?: AuthenticatedCustomer
    }
  }
}

/**
 * Requires a valid client-space JWT (`typ: customer`).
 * Staff tokens are rejected so shoppers and staff sessions stay separate.
 */
export async function requireCustomerAuth(req: Request, _res: Response, next: NextFunction) {
  try {
    req.customer = await loadCustomerFromHeader(req)
    if (!req.customer) {
      throw new CustomError('UNAUTHORIZED', 'Sign in to view your orders.', 401)
    }
    next()
  } catch (error) {
    if (error instanceof CustomError) {
      next(error)
      return
    }
    next(new CustomError('UNAUTHORIZED', 'Invalid token', 401))
  }
}

/**
 * Attaches `req.customer` when a client-space token is present.
 * Invalid or staff tokens are ignored so guest checkout still works.
 */
export async function optionalCustomerAuth(req: Request, _res: Response, next: NextFunction) {
  try {
    req.customer = (await loadCustomerFromHeader(req)) ?? undefined
  } catch {
    req.customer = undefined
  }
  next()
}

async function loadCustomerFromHeader(req: Request): Promise<AuthenticatedCustomer | null> {
  const header = req.headers.authorization
  if (!header?.startsWith('Bearer ')) {
    return null
  }

  const payload = verifyCustomerToken(header.slice(7))
  const customer = await prisma.customer.findUnique({
    where: { id: payload.customerId },
  })
  if (!customer) {
    return null
  }

  return {
    id: customer.id,
    name: customer.name,
    phone: customer.phone,
    email: customer.email,
  }
}

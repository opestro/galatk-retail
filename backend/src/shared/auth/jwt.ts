import jwt, { type SignOptions } from 'jsonwebtoken'
import { StaffRole } from '@prisma/client'

export interface JwtPayload {
  staffId: string
  role: StaffRole
  shopIds: string[]
}

/** Shopper JWT — never treated as staff. `typ` keeps the two token kinds distinct. */
export interface CustomerJwtPayload {
  typ: 'customer'
  customerId: string
}

const getSecret = (): string => {
  const secret = process.env.JWT_SECRET
  if (!secret) {
    throw new Error('JWT_SECRET is not configured')
  }
  return secret
}

function expiresIn(): SignOptions['expiresIn'] {
  return (process.env.JWT_EXPIRES_IN ?? '7d') as SignOptions['expiresIn']
}

export function signToken(payload: JwtPayload): string {
  return jwt.sign(payload, getSecret(), { expiresIn: expiresIn() } as SignOptions)
}

export function verifyToken(token: string): JwtPayload {
  const payload = jwt.verify(token, getSecret()) as JwtPayload & { typ?: string; customerId?: string }
  if (payload.typ === 'customer' || !payload.staffId) {
    throw new Error('Invalid staff token')
  }
  return payload
}

export function signCustomerToken(customerId: string): string {
  const payload: CustomerJwtPayload = { typ: 'customer', customerId }
  return jwt.sign(payload, getSecret(), { expiresIn: expiresIn() } as SignOptions)
}

export function verifyCustomerToken(token: string): CustomerJwtPayload {
  const payload = jwt.verify(token, getSecret()) as CustomerJwtPayload
  if (payload.typ !== 'customer' || !payload.customerId) {
    throw new Error('Invalid customer token')
  }
  return payload
}

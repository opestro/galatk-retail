import jwt, { type SignOptions } from 'jsonwebtoken'
import { StaffRole } from '@prisma/client'

export interface JwtPayload {
  staffId: string
  role: StaffRole
  shopIds: string[]
}

const getSecret = (): string => {
  const secret = process.env.JWT_SECRET
  if (!secret) {
    throw new Error('JWT_SECRET is not configured')
  }
  return secret
}

export function signToken(payload: JwtPayload): string {
  const expiresIn = process.env.JWT_EXPIRES_IN ?? '7d'
  return jwt.sign(payload, getSecret(), { expiresIn } as SignOptions)
}

export function verifyToken(token: string): JwtPayload {
  return jwt.verify(token, getSecret()) as JwtPayload
}

import { Request, Response, NextFunction } from 'express'
import prisma from '../../resources/database/initDatabase.js'
import { verifyToken } from '../auth/jwt.js'
import { CustomError } from '../types/error_type.js'
import { AuthenticatedStaff } from './shopScope.js'
import { StaffRole } from '@prisma/client'

declare global {
  namespace Express {
    interface Request {
      staff?: AuthenticatedStaff
    }
  }
}

async function resolveShopIds(staffId: string, role: StaffRole): Promise<string[]> {
  if (role === StaffRole.OWNER) {
    const shops = await prisma.shop.findMany({ select: { id: true } })
    return shops.map((s) => s.id)
  }

  const assignments = await prisma.staffShopAssignment.findMany({
    where: { staffId },
    select: { shopId: true },
  })
  return assignments.map((a) => a.shopId)
}

export async function requireAuth(req: Request, _res: Response, next: NextFunction) {
  try {
    const header = req.headers.authorization
    if (!header?.startsWith('Bearer ')) {
      throw new CustomError('UNAUTHORIZED', 'Missing or invalid authorization header', 401)
    }

    const token = header.slice(7)
    const payload = verifyToken(token)

    const staff = await prisma.staffUser.findUnique({
      where: { id: payload.staffId },
    })

    if (!staff || !staff.isActive) {
      throw new CustomError('UNAUTHORIZED', 'Invalid or inactive staff account', 401)
    }

    const shopIds = await resolveShopIds(staff.id, staff.role)

    req.staff = {
      id: staff.id,
      email: staff.email,
      name: staff.name,
      role: staff.role,
      shopIds,
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

export function requireRoles(...roles: StaffRole[]) {
  return (req: Request, _res: Response, next: NextFunction) => {
    if (!req.staff) {
      next(new CustomError('UNAUTHORIZED', 'Authentication required', 401))
      return
    }

    if (!roles.includes(req.staff.role)) {
      next(new CustomError('ROLE_DENIED', 'Insufficient permissions', 403))
      return
    }

    next()
  }
}

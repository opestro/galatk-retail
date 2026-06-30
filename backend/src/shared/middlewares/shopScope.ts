import { StaffRole } from '@prisma/client'
import { CustomError } from '../types/error_type.js'

export interface AuthenticatedStaff {
  id: string
  email: string
  name: string
  role: StaffRole
  shopIds: string[]
}

export function assertShopAccess(staff: AuthenticatedStaff, shopId: string): void {
  if (staff.role === StaffRole.OWNER) {
    return
  }

  if (!staff.shopIds.includes(shopId)) {
    throw new CustomError('SHOP_ACCESS_DENIED', 'You do not have access to this shop', 403)
  }
}

export function requireRole(staff: AuthenticatedStaff, allowed: StaffRole[]): void {
  if (!allowed.includes(staff.role)) {
    throw new CustomError('ROLE_DENIED', 'Insufficient permissions', 403)
  }
}

export function requireMinRole(staff: AuthenticatedStaff, minRole: StaffRole): void {
  const hierarchy: Record<StaffRole, number> = {
    [StaffRole.CASHIER]: 1,
    [StaffRole.MANAGER]: 2,
    [StaffRole.OWNER]: 3,
  }

  if (hierarchy[staff.role] < hierarchy[minRole]) {
    throw new CustomError('ROLE_DENIED', 'Insufficient permissions', 403)
  }
}

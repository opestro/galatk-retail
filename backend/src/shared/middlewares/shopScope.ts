import { StaffPermission, StaffRole } from '@prisma/client'
import { CustomError } from '../types/error_type.js'

export interface AuthenticatedStaff {
  id: string
  email: string
  name: string
  role: StaffRole
  /** Effective permissions: the role's set plus personal grants (owners hold all). */
  permissions: StaffPermission[]
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

export function hasPermission(staff: AuthenticatedStaff, permission: StaffPermission): boolean {
  return staff.role === StaffRole.OWNER || staff.permissions.includes(permission)
}

export function requirePermission(staff: AuthenticatedStaff, permission: StaffPermission): void {
  if (!hasPermission(staff, permission)) {
    throw new CustomError('PERMISSION_DENIED', `Missing permission: ${permission}`, 403)
  }
}

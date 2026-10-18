import { describe, it, expect } from 'vitest'
import { StaffPermission, StaffRole } from '@prisma/client'
import { hasPermission, requirePermission } from '../src/shared/middlewares/shopScope.js'
import type { AuthenticatedStaff } from '../src/shared/middlewares/shopScope.js'
import { CustomError } from '../src/shared/types/error_type.js'
import { ALL_PERMISSIONS, DEFAULT_ROLE_PERMISSIONS, PERMISSION_GROUPS } from '../src/shared/auth/permissions.js'

const base = { id: 's', email: 'a@b.c', name: 'S', shopIds: ['shop-1'] }
const owner: AuthenticatedStaff = { ...base, role: StaffRole.OWNER, permissions: [] }
const manager: AuthenticatedStaff = { ...base, role: StaffRole.MANAGER, permissions: [StaffPermission.PRODUCT_VIEW] }

describe('permissions', () => {
  it('owners hold every permission regardless of their list', () => {
    for (const p of ALL_PERMISSIONS) expect(hasPermission(owner, p)).toBe(true)
  })

  it('managers only hold what their role was granted', () => {
    expect(hasPermission(manager, StaffPermission.PRODUCT_VIEW)).toBe(true)
    expect(hasPermission(manager, StaffPermission.PRODUCT_DELETE)).toBe(false)
    expect(() => requirePermission(manager, StaffPermission.PRODUCT_DELETE)).toThrow(CustomError)
  })

  it('lists every permission in exactly one UI group', () => {
    const grouped = PERMISSION_GROUPS.flatMap((g) => g.permissions)
    expect([...grouped].sort()).toEqual([...ALL_PERMISSIONS].sort())
  })

  it('keeps the pre-roles defaults: managers everything, cashiers order handling only', () => {
    expect(DEFAULT_ROLE_PERMISSIONS.MANAGER).toEqual(ALL_PERMISSIONS)
    expect(DEFAULT_ROLE_PERMISSIONS.CASHIER).toEqual([StaffPermission.ORDER_VIEW, StaffPermission.ORDER_PROCESS])
  })
})

describe('effective permissions with groups', () => {
  it('adds group permissions on top of the role set and personal grants', async () => {
    const { effectivePermissions } = await import('../src/shared/auth/permissions.js')
    // OWNER short-circuits before any database lookup.
    expect(await effectivePermissions(StaffRole.OWNER, [], [])).toEqual(ALL_PERMISSIONS)
  })
})

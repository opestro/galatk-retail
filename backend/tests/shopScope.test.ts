import { describe, it, expect } from 'vitest'
import { StaffRole } from '@prisma/client'
import { assertShopAccess, requireMinRole } from '../src/shared/middlewares/shopScope.js'
import { CustomError } from '../src/shared/types/error_type.js'
import type { AuthenticatedStaff } from '../src/shared/middlewares/shopScope.js'

const owner: AuthenticatedStaff = {
  id: 'owner-1',
  email: 'admin@galatk.com',
  name: 'Shop Owner',
  role: StaffRole.OWNER,
  shopIds: [],
}

const manager: AuthenticatedStaff = {
  id: 'manager-1',
  email: 'manager@galatk.com',
  name: 'Shop Manager',
  role: StaffRole.MANAGER,
  shopIds: ['shop-1'],
}

describe('admin cashiering as themselves', () => {
  it('lets owners operate any shop without a cashier login', () => {
    expect(() => assertShopAccess(owner, 'shop-99')).not.toThrow()
    expect(() => requireMinRole(owner, StaffRole.CASHIER)).not.toThrow()
  })

  it('lets managers cashier only in assigned shops', () => {
    expect(() => assertShopAccess(manager, 'shop-1')).not.toThrow()
    expect(() => requireMinRole(manager, StaffRole.CASHIER)).not.toThrow()
    expect(() => assertShopAccess(manager, 'shop-2')).toThrow(CustomError)
  })
})

import { StaffPermission, StaffRole } from '@prisma/client'

const P = StaffPermission

/** Grouped for the Roles screen. Order here is the order shown. */
export const PERMISSION_GROUPS: { id: string; permissions: StaffPermission[] }[] = [
  { id: 'products', permissions: [P.PRODUCT_VIEW, P.PRODUCT_CREATE, P.PRODUCT_EDIT, P.PRODUCT_EDIT_PRICE, P.PRODUCT_DELETE] },
  { id: 'stock', permissions: [P.STOCK_VIEW, P.STOCK_ADJUST, P.INBOUND_VIEW, P.INBOUND_CREATE] },
  { id: 'orders', permissions: [P.ORDER_VIEW, P.ORDER_PROCESS, P.ORDER_EDIT, P.ORDER_CANCEL] },
  { id: 'sales', permissions: [P.SALE_EDIT_PRICE, P.SALE_DISCOUNT, P.SALE_PAY_LATER, P.SALE_VOID_ANY] },
  { id: 'clients', permissions: [P.CLIENT_VIEW, P.CLIENT_EDIT, P.CREDIT_MANAGE] },
  { id: 'finance', permissions: [P.CHARGES_VIEW, P.CHARGES_MANAGE, P.DASHBOARD_VIEW] },
  { id: 'admin', permissions: [P.STAFF_MANAGE, P.SETTINGS_MANAGE, P.SHOPS_MANAGE] },
]

export const ALL_PERMISSIONS = Object.values(StaffPermission) as StaffPermission[]

/** Roles whose permissions the owner can edit. The owner always has everything. */
export const EDITABLE_ROLES: StaffRole[] = [StaffRole.MANAGER, StaffRole.CASHIER]

/** Built-in sets, used until the owner saves a custom one. They mirror the pre-roles behaviour. */
export const DEFAULT_ROLE_PERMISSIONS: Record<StaffRole, StaffPermission[]> = {
  [StaffRole.OWNER]: ALL_PERMISSIONS,
  [StaffRole.MANAGER]: ALL_PERMISSIONS,
  [StaffRole.CASHIER]: [P.ORDER_VIEW, P.ORDER_PROCESS],
}

export async function getRolePermissions(role: StaffRole): Promise<StaffPermission[]> {
  if (role === StaffRole.OWNER) return ALL_PERMISSIONS
  // Lazy import keeps the constants above usable without a database connection (tests, scripts).
  const { default: prisma } = await import('../../resources/database/initDatabase.js')
  const row = await prisma.rolePermissionSet.findUnique({ where: { role } })
  return row ? row.permissions : DEFAULT_ROLE_PERMISSIONS[role]
}

/** What a staff member can actually do: their role's set, their groups' sets and any personal grants. */
export async function effectivePermissions(
  role: StaffRole,
  own: StaffPermission[],
  groups: { permissions: StaffPermission[] }[] = [],
): Promise<StaffPermission[]> {
  if (role === StaffRole.OWNER) return ALL_PERMISSIONS
  return [...new Set([...(await getRolePermissions(role)), ...groups.flatMap((g) => g.permissions), ...own])]
}

export const GROUP_PERMISSIONS_SELECT = { groups: { select: { permissions: true } } } as const

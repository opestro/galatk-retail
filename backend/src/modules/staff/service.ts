import prisma from '../../resources/database/initDatabase.js'
import { CustomError } from '../../shared/types/error_type.js'
import { hashPassword } from '../auth/service.js'
import { AuthenticatedStaff, requirePermission } from '../../shared/middlewares/shopScope.js'
import { StaffPermission, StaffRole } from '@prisma/client'

export interface CreateStaffInput {
  email: string
  password: string
  name: string
  role: StaffRole
  permissions?: StaffPermission[]
  groupIds?: string[]
  shopIds: string[]
}

export interface UpdateStaffInput {
  role?: StaffRole
  permissions?: StaffPermission[]
  groupIds?: string[]
  isActive?: boolean
  shopIds?: string[]
}

/** Only cashiers carry explicit grants; higher roles already have everything. */
function normalizePermissions(role: StaffRole, value: unknown): StaffPermission[] {
  if (role !== StaffRole.CASHIER || value === undefined) {
    return []
  }
  if (!Array.isArray(value)) {
    throw new CustomError('VALIDATION_ERROR', 'permissions must be an array', 400)
  }
  const allowed = Object.values(StaffPermission) as string[]
  const invalid = value.find((p) => !allowed.includes(p))
  if (invalid !== undefined) {
    throw new CustomError('VALIDATION_ERROR', `Unknown permission: ${String(invalid)}`, 400)
  }
  return [...new Set(value as StaffPermission[])]
}

const staffInclude = {
  shopAssignments: { include: { shop: { select: { id: true, name: true } } } },
  groups: { select: { id: true, name: true } },
} as const

/** Never send the password hash to the browser. */
function withoutSecrets<T extends { passwordHash?: string }>(member: T): Omit<T, 'passwordHash'> {
  const { passwordHash: _hash, ...rest } = member
  return rest
}

/** Handing out groups hands out permissions, so only the owner may do it. */
async function resolveGroupIds(actor: AuthenticatedStaff, groupIds: unknown) {
  if (groupIds === undefined) return undefined
  if (actor.role !== StaffRole.OWNER) {
    throw new CustomError('ROLE_DENIED', 'Only the owner can assign groups', 403)
  }
  if (!Array.isArray(groupIds) || groupIds.some((id) => typeof id !== 'string')) {
    throw new CustomError('VALIDATION_ERROR', 'groupIds must be a list of ids', 400)
  }
  const found = await prisma.staffGroup.count({ where: { id: { in: groupIds as string[] } } })
  if (found !== new Set(groupIds).size) {
    throw new CustomError('GROUP_NOT_FOUND', 'Group not found', 404)
  }
  return (groupIds as string[]).map((id) => ({ id }))
}

export async function listStaff(staff: AuthenticatedStaff) {
  requirePermission(staff, StaffPermission.STAFF_MANAGE)

  if (staff.role === StaffRole.OWNER) {
    return (await prisma.staffUser.findMany({ include: staffInclude, orderBy: { name: 'asc' } })).map(withoutSecrets)
  }

  const members = await prisma.staffUser.findMany({
    where: {
      shopAssignments: { some: { shopId: { in: staff.shopIds } } },
      role: { not: StaffRole.OWNER },
    },
    include: staffInclude,
    orderBy: { name: 'asc' },
  })
  return members.map(withoutSecrets)
}

export async function createStaff(actor: AuthenticatedStaff, input: CreateStaffInput) {
  requirePermission(actor, StaffPermission.STAFF_MANAGE)

  if (actor.role === StaffRole.MANAGER && input.role === StaffRole.OWNER) {
    throw new CustomError('ROLE_DENIED', 'Managers cannot create owners', 403)
  }

  const existing = await prisma.staffUser.findUnique({ where: { email: input.email.toLowerCase() } })
  if (existing) {
    throw new CustomError('EMAIL_EXISTS', 'Email already in use', 400)
  }

  const passwordHash = await hashPassword(input.password)
  const groups = await resolveGroupIds(actor, input.groupIds)

  return withoutSecrets(await prisma.staffUser.create({
    data: {
      email: input.email.toLowerCase(),
      passwordHash,
      name: input.name,
      role: input.role,
      permissions: normalizePermissions(input.role, input.permissions),
      ...(groups ? { groups: { connect: groups } } : {}),
      shopAssignments: {
        create: input.shopIds.map((shopId) => ({ shopId })),
      },
    },
    include: staffInclude,
  }))
}

export async function updateStaff(actor: AuthenticatedStaff, staffId: string, input: UpdateStaffInput) {
  requirePermission(actor, StaffPermission.STAFF_MANAGE)

  const target = await prisma.staffUser.findUnique({
    where: { id: staffId },
    include: { shopAssignments: true },
  })

  if (!target) {
    throw new CustomError('STAFF_NOT_FOUND', 'Staff not found', 404)
  }

  if (actor.role === StaffRole.MANAGER && target.role === StaffRole.OWNER) {
    throw new CustomError('ROLE_DENIED', 'Cannot modify owner accounts', 403)
  }

  const groups = await resolveGroupIds(actor, input.groupIds)

  if (input.shopIds) {
    await prisma.staffShopAssignment.deleteMany({ where: { staffId } })
    await prisma.staffShopAssignment.createMany({
      data: input.shopIds.map((shopId) => ({ staffId, shopId })),
    })
  }

  const nextRole = input.role ?? target.role
  const permissions =
    input.permissions !== undefined
      ? normalizePermissions(nextRole, input.permissions)
      : nextRole !== StaffRole.CASHIER
        ? []
        : undefined

  return withoutSecrets(await prisma.staffUser.update({
    where: { id: staffId },
    data: {
      role: input.role,
      permissions,
      isActive: input.isActive,
      ...(groups ? { groups: { set: groups } } : {}),
    },
    include: staffInclude,
  }))
}

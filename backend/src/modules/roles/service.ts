import { StaffPermission, StaffRole } from '@prisma/client'
import prisma from '../../resources/database/initDatabase.js'
import { CustomError } from '../../shared/types/error_type.js'
import {
  ALL_PERMISSIONS,
  DEFAULT_ROLE_PERMISSIONS,
  EDITABLE_ROLES,
  PERMISSION_GROUPS,
  getRolePermissions,
} from '../../shared/auth/permissions.js'

export async function listRoles() {
  const roles = await Promise.all(
    EDITABLE_ROLES.map(async (role) => ({ role, permissions: await getRolePermissions(role) })),
  )
  const groups = await prisma.staffGroup.findMany({
    orderBy: { name: 'asc' },
    include: { _count: { select: { members: true } } },
  })
  return {
    roles,
    categories: PERMISSION_GROUPS,
    defaults: DEFAULT_ROLE_PERMISSIONS,
    groups: groups.map(presentGroup),
  }
}

type GroupRow = { id: string; name: string; permissions: StaffPermission[]; _count: { members: number } }

function presentGroup(group: GroupRow) {
  return { id: group.id, name: group.name, permissions: group.permissions, memberCount: group._count.members }
}

function parsePermissions(value: unknown): StaffPermission[] {
  if (!Array.isArray(value) || value.some((v) => !ALL_PERMISSIONS.includes(v as StaffPermission))) {
    throw new CustomError('VALIDATION_ERROR', 'permissions must be a list of valid permissions', 400)
  }
  return [...new Set(value as StaffPermission[])]
}

function parseName(value: unknown): string {
  const name = typeof value === 'string' ? value.trim() : ''
  if (!name || name.length > 40) {
    throw new CustomError('VALIDATION_ERROR', 'Group name is required (max 40 characters)', 400)
  }
  return name
}

async function saveGroup<T>(action: () => Promise<T>): Promise<T> {
  try {
    return await action()
  } catch (error) {
    if ((error as { code?: string }).code === 'P2002') {
      throw new CustomError('GROUP_EXISTS', 'A group with this name already exists', 409)
    }
    if ((error as { code?: string }).code === 'P2025') {
      throw new CustomError('GROUP_NOT_FOUND', 'Group not found', 404)
    }
    throw error
  }
}

const withCount = { _count: { select: { members: true } } } as const

export async function createGroup(input: { name?: unknown; permissions?: unknown }) {
  const data = { name: parseName(input.name), permissions: parsePermissions(input.permissions ?? []) }
  return presentGroup(await saveGroup(() => prisma.staffGroup.create({ data, include: withCount })))
}

export async function updateGroup(id: string, input: { name?: unknown; permissions?: unknown }) {
  const data = {
    ...(input.name !== undefined ? { name: parseName(input.name) } : {}),
    ...(input.permissions !== undefined ? { permissions: parsePermissions(input.permissions) } : {}),
  }
  return presentGroup(await saveGroup(() => prisma.staffGroup.update({ where: { id }, data, include: withCount })))
}

export async function deleteGroup(id: string) {
  await saveGroup(() => prisma.staffGroup.delete({ where: { id } }))
}

export async function updateRole(roleName: string, value: unknown) {
  const role = EDITABLE_ROLES.find((r) => r === roleName)
  if (!role) {
    throw new CustomError('VALIDATION_ERROR', 'Only the manager and cashier roles can be edited', 400)
  }
  const permissions = parsePermissions(value)
  await prisma.rolePermissionSet.upsert({
    where: { role },
    create: { role, permissions },
    update: { permissions },
  })
  return { role: role as StaffRole, permissions }
}

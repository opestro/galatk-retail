import prisma from '../../resources/database/initDatabase.js'
import { CustomError } from '../../shared/types/error_type.js'
import { hashPassword } from '../auth/service.js'
import { AuthenticatedStaff, requireMinRole } from '../../shared/middlewares/shopScope.js'
import { StaffRole } from '@prisma/client'

export interface CreateStaffInput {
  email: string
  password: string
  name: string
  role: StaffRole
  shopIds: string[]
}

export interface UpdateStaffInput {
  role?: StaffRole
  isActive?: boolean
  shopIds?: string[]
}

export async function listStaff(staff: AuthenticatedStaff) {
  requireMinRole(staff, StaffRole.MANAGER)

  if (staff.role === StaffRole.OWNER) {
    return prisma.staffUser.findMany({
      include: { shopAssignments: { include: { shop: { select: { id: true, name: true } } } } },
      orderBy: { name: 'asc' },
    })
  }

  return prisma.staffUser.findMany({
    where: {
      shopAssignments: { some: { shopId: { in: staff.shopIds } } },
      role: { not: StaffRole.OWNER },
    },
    include: { shopAssignments: { include: { shop: { select: { id: true, name: true } } } } },
    orderBy: { name: 'asc' },
  })
}

export async function createStaff(actor: AuthenticatedStaff, input: CreateStaffInput) {
  requireMinRole(actor, StaffRole.MANAGER)

  if (actor.role === StaffRole.MANAGER && input.role === StaffRole.OWNER) {
    throw new CustomError('ROLE_DENIED', 'Managers cannot create owners', 403)
  }

  const existing = await prisma.staffUser.findUnique({ where: { email: input.email.toLowerCase() } })
  if (existing) {
    throw new CustomError('EMAIL_EXISTS', 'Email already in use', 400)
  }

  const passwordHash = await hashPassword(input.password)

  return prisma.staffUser.create({
    data: {
      email: input.email.toLowerCase(),
      passwordHash,
      name: input.name,
      role: input.role,
      shopAssignments: {
        create: input.shopIds.map((shopId) => ({ shopId })),
      },
    },
    include: { shopAssignments: { include: { shop: { select: { id: true, name: true } } } } },
  })
}

export async function updateStaff(actor: AuthenticatedStaff, staffId: string, input: UpdateStaffInput) {
  requireMinRole(actor, StaffRole.MANAGER)

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

  if (input.shopIds) {
    await prisma.staffShopAssignment.deleteMany({ where: { staffId } })
    await prisma.staffShopAssignment.createMany({
      data: input.shopIds.map((shopId) => ({ staffId, shopId })),
    })
  }

  return prisma.staffUser.update({
    where: { id: staffId },
    data: {
      role: input.role,
      isActive: input.isActive,
    },
    include: { shopAssignments: { include: { shop: { select: { id: true, name: true } } } } },
  })
}

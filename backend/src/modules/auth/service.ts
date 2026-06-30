import prisma from '../../resources/database/initDatabase.js'
import { hashPassword, verifyPassword } from '../../shared/auth/password.js'
import { signToken } from '../../shared/auth/jwt.js'
import { CustomError } from '../../shared/types/error_type.js'
import { LoginInput, StaffProfile } from './types.js'
import { StaffRole } from '@prisma/client'

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

export async function login(input: LoginInput) {
  const staff = await prisma.staffUser.findUnique({
    where: { email: input.email.toLowerCase() },
  })

  if (!staff || !staff.isActive) {
    throw new CustomError('INVALID_CREDENTIALS', 'Invalid email or password', 401)
  }

  const valid = await verifyPassword(input.password, staff.passwordHash)
  if (!valid) {
    throw new CustomError('INVALID_CREDENTIALS', 'Invalid email or password', 401)
  }

  const shopIds = await resolveShopIds(staff.id, staff.role)
  const token = signToken({ staffId: staff.id, role: staff.role, shopIds })

  return {
    token,
    staff: {
      id: staff.id,
      email: staff.email,
      name: staff.name,
      role: staff.role,
      shopIds,
    },
  }
}

export async function getMe(staffId: string): Promise<StaffProfile> {
  const staff = await prisma.staffUser.findUnique({ where: { id: staffId } })

  if (!staff || !staff.isActive) {
    throw new CustomError('UNAUTHORIZED', 'Staff not found', 401)
  }

  const shopIds = await resolveShopIds(staff.id, staff.role)

  return {
    id: staff.id,
    email: staff.email,
    name: staff.name,
    role: staff.role,
    shopIds,
  }
}

export { hashPassword }

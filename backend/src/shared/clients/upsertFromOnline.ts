import prisma from '../../resources/database/initDatabase.js'
import { Prisma } from '@prisma/client'

export interface OnlineCustomerInput {
  name: string
  phone: string
  email?: string
  address?: string
}

export async function findOrCreateClientFromOnlineOrder(
  shopId: string,
  input: OnlineCustomerInput,
) {
  const phone = input.phone.trim()
  const name = input.name.trim()

  const existing = await prisma.client.findUnique({ where: { phone } })
  if (existing) {
    return existing
  }

  try {
    return await prisma.client.create({
      data: {
        shopId,
        name,
        phone,
        email: input.email?.trim() ?? null,
        address: input.address?.trim() ?? null,
        notes: 'Auto-registered from online order',
      },
    })
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
      return prisma.client.findUniqueOrThrow({ where: { phone } })
    }
    throw error
  }
}

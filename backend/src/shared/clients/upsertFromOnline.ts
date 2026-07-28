import prisma from '../../resources/database/initDatabase.js'
import { Prisma } from '@prisma/client'

export interface OnlineCustomerInput {
  name: string
  phone: string
  email?: string
  address?: string
}

/**
 * Resolves the global Customer identity for a phone number, creating one if needed.
 */
async function findOrCreateCustomer(input: OnlineCustomerInput) {
  const phone = input.phone.trim()
  const name = input.name.trim()

  const existing = await prisma.customer.findUnique({ where: { phone } })
  if (existing) {
    return existing
  }

  try {
    return await prisma.customer.create({
      data: {
        name,
        phone,
        email: input.email?.trim() ?? null,
      },
    })
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
      return prisma.customer.findUniqueOrThrow({ where: { phone } })
    }
    throw error
  }
}

/**
 * Looks up an existing Customer by phone number, for pre-filling checkout
 * forms (name/email) when a returning customer types a known phone number.
 * Returns null if no Customer exists for that phone yet.
 */
export async function lookupCustomerByPhone(phone: string) {
  const trimmed = phone.trim()
  if (!trimmed) return null

  const customer = await prisma.customer.findUnique({ where: { phone: trimmed } })
  if (!customer) return null

  return {
    name: customer.name,
    email: customer.email,
    phone: customer.phone,
  }
}

/**
 * Resolves the per-shop Client record for a customer, creating one if this is
 * their first purchase at this shop. The same Customer can have a distinct
 * Client (credit/balance record) at each shop they buy from.
 */
export async function findOrCreateClientFromOnlineOrder(shopId: string, input: OnlineCustomerInput) {
  const phone = input.phone.trim()
  const name = input.name.trim()

  const customer = await findOrCreateCustomer(input)

  const existingClient = await prisma.client.findUnique({
    where: { shopId_phone: { shopId, phone } },
  })
  if (existingClient) {
    return existingClient
  }

  try {
    return await prisma.client.create({
      data: {
        shopId,
        customerId: customer.id,
        name,
        phone,
        email: input.email?.trim() ?? null,
        address: input.address?.trim() ?? null,
        notes: 'Auto-registered from online order',
      },
    })
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
      return prisma.client.findUniqueOrThrow({ where: { shopId_phone: { shopId, phone } } })
    }
    throw error
  }
}

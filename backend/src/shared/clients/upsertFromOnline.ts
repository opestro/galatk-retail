import prisma from '../../resources/database/initDatabase.js'
import { Prisma } from '@prisma/client'
import { phoneLookupKeys, normalizeAlgerianPhone } from '../validation/algerianPhone.js'

export interface OnlineCustomerInput {
  name: string
  phone: string
  email?: string
  address?: string
}

async function findCustomerByPhone(phone: string) {
  const keys = phoneLookupKeys(phone)
  return prisma.customer.findFirst({
    where: { phone: { in: keys } },
  })
}

/**
 * Resolves the global Customer identity for a phone number, creating one if needed.
 */
async function findOrCreateCustomer(input: OnlineCustomerInput) {
  const canonical = normalizeAlgerianPhone(input.phone) ?? input.phone.trim()
  const name = input.name.trim()

  const existing = await findCustomerByPhone(input.phone)
  if (existing) {
    if (existing.name !== name || (input.email && existing.email !== input.email.trim())) {
      return prisma.customer.update({
        where: { id: existing.id },
        data: {
          name,
          email: input.email?.trim() ?? existing.email,
        },
      })
    }
    return existing
  }

  try {
    return await prisma.customer.create({
      data: {
        name,
        phone: canonical,
        email: input.email?.trim() ?? null,
      },
    })
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
      return prisma.customer.findUniqueOrThrow({ where: { phone: canonical } })
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

  const customer = await findCustomerByPhone(trimmed)
  if (!customer) return null

  const lastOrder = await prisma.onlineOrder.findFirst({
    where: { customerPhone: { in: phoneLookupKeys(trimmed) } },
    orderBy: { createdAt: 'desc' },
    select: { customerWilaya: true },
  })

  return {
    name: customer.name,
    email: customer.email,
    phone: customer.phone,
    wilaya: lastOrder?.customerWilaya ?? null,
  }
}

/**
 * Resolves the per-shop Client record for a customer, creating one if this is
 * their first purchase at this shop. The same Customer can have a distinct
 * Client (credit/balance record) at each shop they buy from.
 */
export async function findOrCreateClientFromOnlineOrder(shopId: string, input: OnlineCustomerInput) {
  const phone = normalizeAlgerianPhone(input.phone) ?? input.phone.trim()
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

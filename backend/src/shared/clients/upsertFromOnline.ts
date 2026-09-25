import prisma from '../../resources/database/initDatabase.js'
import { Prisma } from '@prisma/client'
import { phoneLookupKeys, normalizeAlgerianPhone } from '../validation/algerianPhone.js'
import { CustomError } from '../types/error_type.js'

export interface OnlineCustomerInput {
  name: string
  phone: string
  email?: string
  address?: string
  /** Plain password from checkout when the shopper is not already signed in. */
  password?: string
  /** When set, checkout is tied to this account and no password is required. */
  authenticatedCustomerId?: string
}

async function findCustomerByPhone(phone: string) {
  const keys = phoneLookupKeys(phone)
  return prisma.customer.findFirst({
    where: { phone: { in: keys } },
  })
}

/**
 * Resolves the global Customer for checkout. Orders require a signed-in account.
 */
export async function ensureCustomerForCheckout(input: OnlineCustomerInput) {
  if (!input.authenticatedCustomerId) {
    throw new CustomError('UNAUTHORIZED', 'Create an account to place an order.', 401)
  }

  const customer = await prisma.customer.findUnique({
    where: { id: input.authenticatedCustomerId },
  })
  if (!customer) {
    throw new CustomError('UNAUTHORIZED', 'Sign in to continue.', 401)
  }

  const name = input.name.trim()
  if (name && name !== customer.name) {
    return prisma.customer.update({
      where: { id: customer.id },
      data: { name, email: input.email?.trim() ?? customer.email },
    })
  }
  return customer
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
    hasPassword: Boolean(customer.passwordHash),
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

  const customer = await ensureCustomerForCheckout(input)

  const existingClient = await prisma.client.findUnique({
    where: { shopId_phone: { shopId, phone: customer.phone || phone } },
  })
  if (existingClient) {
    return existingClient
  }

  const clientPhone = customer.phone || phone

  try {
    return await prisma.client.create({
      data: {
        shopId,
        customerId: customer.id,
        name: customer.name || name,
        phone: clientPhone,
        email: input.email?.trim() ?? customer.email,
        address: input.address?.trim() ?? null,
        notes: 'Auto-registered from online order',
      },
    })
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
      return prisma.client.findUniqueOrThrow({
        where: { shopId_phone: { shopId, phone: clientPhone } },
      })
    }
    throw error
  }
}

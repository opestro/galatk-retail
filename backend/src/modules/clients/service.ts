import prisma from '../../resources/database/initDatabase.js'
import { CustomError } from '../../shared/types/error_type.js'
import { AuthenticatedStaff, assertShopAccess, requirePermission } from '../../shared/middlewares/shopScope.js'
import { CreateClientInput, UpdateClientInput } from './types.js'
import { Decimal } from '@prisma/client/runtime/library'
import { canonicalWilaya } from '../../shared/geo/algeriaWilayas.js'
import { hashPassword } from '../../shared/auth/password.js'
import { normalizeEmail } from '../../shared/validation/email.js'
import { MIN_CUSTOMER_PASSWORD_LENGTH } from '../account/constants.js'
import { Prisma, StaffRole, StaffPermission } from '@prisma/client'

const LEDGER_PREVIEW_LIMIT = 10

export async function listClients(
  staff: AuthenticatedStaff,
  shopId: string,
  query?: string,
  activeOnly?: boolean,
  withBalance?: boolean,
) {
  assertShopAccess(staff, shopId)

  const where: Prisma.ClientWhereInput = { shopId }

  if (activeOnly) {
    where.isActive = true
  }

  if (withBalance) {
    where.balance = { gt: 0 }
  }

  if (query?.trim()) {
    const q = query.trim()
    where.OR = [
      { name: { contains: q, mode: 'insensitive' } },
      { phone: { contains: q, mode: 'insensitive' } },
    ]
  }

  return prisma.client.findMany({
    where,
    orderBy: { name: 'asc' },
  })
}

function parseWilaya(value: string | null | undefined): string | null {
  if (!value?.trim()) return null
  const wilaya = canonicalWilaya(value)
  if (!wilaya) throw new CustomError('VALIDATION_ERROR', 'Please choose a valid wilaya', 400)
  return wilaya
}

export async function createClient(
  staff: AuthenticatedStaff,
  shopId: string,
  input: CreateClientInput,
) {
  assertShopAccess(staff, shopId)
  requirePermission(staff, StaffPermission.CLIENT_EDIT)

  if (!input.name?.trim() || !input.phone?.trim()) {
    throw new CustomError('VALIDATION_ERROR', 'Name and phone are required', 400)
  }

  const name = input.name.trim()
  const phone = input.phone.trim()
  const rawEmail = input.email?.trim() || null
  const password = input.password?.trim() ?? ''
  const wilaya = parseWilaya(input.wilaya)

  // An optional password also opens the shopper's store account (email + password login).
  let accountEmail: string | null = null
  let passwordHash: string | null = null
  if (password) {
    accountEmail = normalizeEmail(rawEmail)
    if (!accountEmail) {
      throw new CustomError('VALIDATION_ERROR', 'A valid email is required to create a login account', 400)
    }
    if (password.length < MIN_CUSTOMER_PASSWORD_LENGTH) {
      throw new CustomError(
        'VALIDATION_ERROR',
        `Password must be at least ${MIN_CUSTOMER_PASSWORD_LENGTH} characters`,
        400,
      )
    }
    passwordHash = await hashPassword(password)
  }

  try {
    const existing = await prisma.customer.findUnique({ where: { phone } })
    if (passwordHash) {
      if (existing?.passwordHash) {
        throw new CustomError('ACCOUNT_EXISTS', 'This phone number already has a login account', 409)
      }
      const emailOwner = await prisma.customer.findUnique({ where: { email: accountEmail! } })
      if (emailOwner && emailOwner.id !== existing?.id) {
        throw new CustomError('ACCOUNT_EXISTS', 'This email is already used by another account', 409)
      }
    }
    const customer = existing
      ? passwordHash
        ? await prisma.customer.update({
            where: { id: existing.id },
            data: { email: accountEmail, passwordHash },
          })
        : existing
      : await prisma.customer.create({
          data: { name, phone, email: accountEmail ?? rawEmail, passwordHash },
        })

    return await prisma.client.create({
      data: {
        shopId,
        customerId: customer.id,
        name,
        phone,
        email: input.email?.trim() ?? null,
        address: input.address?.trim() ?? null,
        wilaya,
        notes: input.notes?.trim() ?? null,
        creditLimit:
          input.creditLimit !== undefined && input.creditLimit !== null
            ? new Decimal(input.creditLimit)
            : null,
      },
    })
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
      throw new CustomError('DUPLICATE_PHONE', 'Phone number already registered at this shop', 400)
    }
    throw error
  }
}

async function getClientRecord(clientId: string) {
  const client = await prisma.client.findUnique({ where: { id: clientId } })
  if (!client) {
    throw new CustomError('CLIENT_NOT_FOUND', 'Client not found', 404)
  }
  return client
}

export async function getClientForStaff(staff: AuthenticatedStaff, clientId: string) {
  const client = await getClientRecord(clientId)
  assertShopAccess(staff, client.shopId)
  return client
}

export async function getClientProfile(staff: AuthenticatedStaff, clientId: string) {
  const client = await getClientForStaff(staff, clientId)

  const ledgerPreview = await prisma.clientLedgerEntry.findMany({
    where: { clientId },
    include: { recordedBy: { select: { id: true, name: true } } },
    orderBy: { createdAt: 'desc' },
    take: LEDGER_PREVIEW_LIMIT,
  })

  return { client, ledgerPreview }
}

export async function updateClient(
  staff: AuthenticatedStaff,
  clientId: string,
  input: UpdateClientInput,
) {
  requirePermission(staff, StaffPermission.CLIENT_EDIT)
  const client = await getClientForStaff(staff, clientId)

  try {
    return await prisma.client.update({
      where: { id: client.id },
      data: {
        name: input.name?.trim(),
        phone: input.phone?.trim(),
        email: input.email !== undefined ? (input.email?.trim() ?? null) : undefined,
        address: input.address !== undefined ? (input.address?.trim() ?? null) : undefined,
        wilaya: input.wilaya !== undefined ? parseWilaya(input.wilaya) : undefined,
        notes: input.notes !== undefined ? (input.notes?.trim() ?? null) : undefined,
        creditLimit:
          input.creditLimit !== undefined
            ? input.creditLimit === null
              ? null
              : new Decimal(input.creditLimit)
            : undefined,
        isActive: input.isActive,
      },
    })
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
      throw new CustomError('DUPLICATE_PHONE', 'Phone number already registered', 400)
    }
    throw error
  }
}

export async function deactivateClient(staff: AuthenticatedStaff, clientId: string) {
  return updateClient(staff, clientId, { isActive: false })
}

export async function deleteClient(staff: AuthenticatedStaff, clientId: string) {
  requirePermission(staff, StaffPermission.CLIENT_EDIT)
  const client = await getClientForStaff(staff, clientId)

  if (client.balance.gt(0)) {
    throw new CustomError(
      'CLIENT_HAS_BALANCE',
      'Cannot delete client with outstanding balance; deactivate instead',
      400,
    )
  }

  await prisma.client.delete({ where: { id: client.id } })
}

export async function getClientLedger(staff: AuthenticatedStaff, clientId: string) {
  requirePermission(staff, StaffPermission.CLIENT_VIEW)
  await getClientForStaff(staff, clientId)

  return prisma.clientLedgerEntry.findMany({
    where: { clientId },
    include: { recordedBy: { select: { id: true, name: true } } },
    orderBy: { createdAt: 'desc' },
  })
}

/**
 * Returns everything a client has bought at this shop: in-person POS sales
 * and online orders, each with their line items. Used by the "view items
 * purchased" action in POS orders/credits views.
 */
export async function getClientPurchases(staff: AuthenticatedStaff, clientId: string) {
  await getClientForStaff(staff, clientId)

  const [sales, onlineOrders] = await Promise.all([
    prisma.sale.findMany({
      where: { clientId },
      include: {
        lines: { include: { product: { select: { id: true, name: true } } } },
        cashier: { select: { id: true, name: true } },
      },
      orderBy: { createdAt: 'desc' },
    }),
    prisma.onlineOrder.findMany({
      where: { clientId },
      include: {
        lines: { include: { product: { select: { id: true, name: true } } } },
      },
      orderBy: { createdAt: 'desc' },
    }),
  ])

  return { sales, onlineOrders }
}

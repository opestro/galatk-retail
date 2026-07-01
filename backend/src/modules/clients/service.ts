import prisma from '../../resources/database/initDatabase.js'
import { CustomError } from '../../shared/types/error_type.js'
import { AuthenticatedStaff, assertShopAccess, requireMinRole } from '../../shared/middlewares/shopScope.js'
import { CreateClientInput, UpdateClientInput } from './types.js'
import { Decimal } from '@prisma/client/runtime/library'
import { Prisma, StaffRole } from '@prisma/client'

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

export async function createClient(
  staff: AuthenticatedStaff,
  shopId: string,
  input: CreateClientInput,
) {
  assertShopAccess(staff, shopId)
  requireMinRole(staff, StaffRole.MANAGER)

  if (!input.name?.trim() || !input.phone?.trim()) {
    throw new CustomError('VALIDATION_ERROR', 'Name and phone are required', 400)
  }

  try {
    return await prisma.client.create({
      data: {
        shopId,
        name: input.name.trim(),
        phone: input.phone.trim(),
        email: input.email?.trim() ?? null,
        address: input.address?.trim() ?? null,
        notes: input.notes?.trim() ?? null,
        creditLimit:
          input.creditLimit !== undefined && input.creditLimit !== null
            ? new Decimal(input.creditLimit)
            : null,
      },
    })
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
      throw new CustomError('DUPLICATE_PHONE', 'Phone number already registered', 400)
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
  requireMinRole(staff, StaffRole.MANAGER)
  const client = await getClientForStaff(staff, clientId)

  try {
    return await prisma.client.update({
      where: { id: client.id },
      data: {
        name: input.name?.trim(),
        phone: input.phone?.trim(),
        email: input.email !== undefined ? (input.email?.trim() ?? null) : undefined,
        address: input.address !== undefined ? (input.address?.trim() ?? null) : undefined,
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
  requireMinRole(staff, StaffRole.MANAGER)
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
  requireMinRole(staff, StaffRole.MANAGER)
  await getClientForStaff(staff, clientId)

  return prisma.clientLedgerEntry.findMany({
    where: { clientId },
    include: { recordedBy: { select: { id: true, name: true } } },
    orderBy: { createdAt: 'desc' },
  })
}

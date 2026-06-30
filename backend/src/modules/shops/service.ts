import prisma from '../../resources/database/initDatabase.js'
import { CustomError } from '../../shared/types/error_type.js'
import { AuthenticatedStaff } from '../../shared/middlewares/shopScope.js'
import { assertShopAccess } from '../../shared/middlewares/shopScope.js'
import { CreateShopInput, UpdateShopInput } from './types.js'
import { StaffRole } from '@prisma/client'

function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
}

export async function listShops(staff: AuthenticatedStaff) {
  if (staff.role === StaffRole.OWNER) {
    return prisma.shop.findMany({ orderBy: { name: 'asc' } })
  }

  return prisma.shop.findMany({
    where: { id: { in: staff.shopIds } },
    orderBy: { name: 'asc' },
  })
}

export async function createShop(staff: AuthenticatedStaff, input: CreateShopInput) {
  if (staff.role !== StaffRole.OWNER) {
    throw new CustomError('ROLE_DENIED', 'Only owners can create shops', 403)
  }

  const slug = input.slug || slugify(input.name)
  const existing = await prisma.shop.findUnique({ where: { slug } })
  if (existing) {
    throw new CustomError('SLUG_EXISTS', 'Shop slug already exists', 400)
  }

  return prisma.shop.create({
    data: {
      name: input.name,
      slug,
      address: input.address,
      contactPhone: input.contactPhone ?? null,
      serviceCity: input.serviceCity,
      deliveryFee: input.deliveryFee,
      outOfStockDisplay: input.outOfStockDisplay,
      creditReminderDays: input.creditReminderDays,
    },
  })
}

export async function getShopById(staff: AuthenticatedStaff, shopId: string) {
  assertShopAccess(staff, shopId)
  const shop = await prisma.shop.findUnique({ where: { id: shopId } })
  if (!shop) {
    throw new CustomError('SHOP_NOT_FOUND', 'Shop not found', 404)
  }
  return shop
}

export async function updateShop(staff: AuthenticatedStaff, shopId: string, input: UpdateShopInput) {
  assertShopAccess(staff, shopId)

  const shop = await prisma.shop.findUnique({ where: { id: shopId } })
  if (!shop) {
    throw new CustomError('SHOP_NOT_FOUND', 'Shop not found', 404)
  }

  return prisma.shop.update({
    where: { id: shopId },
    data: {
      name: input.name,
      address: input.address,
      contactPhone: input.contactPhone,
      serviceCity: input.serviceCity,
      deliveryFee: input.deliveryFee,
      outOfStockDisplay: input.outOfStockDisplay,
      creditReminderDays: input.creditReminderDays,
    },
  })
}

export async function getShopBySlug(slug: string) {
  const shop = await prisma.shop.findUnique({ where: { slug } })
  if (!shop) {
    throw new CustomError('SHOP_NOT_FOUND', 'Shop not found', 404)
  }
  return shop
}

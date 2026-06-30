import prisma from '../../resources/database/initDatabase.js'
import { AuthenticatedStaff, assertShopAccess, requireMinRole } from '../../shared/middlewares/shopScope.js'
import { ClientPaymentStatus, SaleStatus, ShopChargeStatus, StaffRole } from '@prisma/client'
import { Decimal } from '@prisma/client/runtime/library'
import { CustomError } from '../../shared/types/error_type.js'

const LOW_STOCK_THRESHOLD = 5

function parseDateRange(from?: string, to?: string) {
  const now = new Date()
  const fromDate = from ? new Date(from) : new Date(now.getFullYear(), now.getMonth(), 1)
  const toDate = to ? new Date(to) : now
  toDate.setUTCHours(23, 59, 59, 999)
  fromDate.setUTCHours(0, 0, 0, 0)
  return { fromDate, toDate }
}

export interface FinancialSummary {
  posCollected: string
  clientPaymentsReceived: string
  totalCashIn: string
  outstandingCredit: string
  totalCharges: string
}

export interface NetworkFinancialSummary {
  shops: Array<{ shopId: string; shopName: string; shopSlug: string } & FinancialSummary>
  totals: FinancialSummary
}

export async function getShopSummary(staff: AuthenticatedStaff, shopId: string) {
  assertShopAccess(staff, shopId)
  requireMinRole(staff, StaffRole.MANAGER)

  const todayStart = new Date()
  todayStart.setUTCHours(0, 0, 0, 0)
  const todayEnd = new Date(todayStart)
  todayEnd.setUTCDate(todayEnd.getUTCDate() + 1)

  const [salesToday, lowStock] = await Promise.all([
    prisma.sale.findMany({
      where: {
        shopId,
        status: SaleStatus.COMPLETED,
        createdAt: { gte: todayStart, lt: todayEnd },
      },
    }),
    prisma.shopStock.findMany({
      where: { shopId, quantity: { lte: LOW_STOCK_THRESHOLD } },
      include: { product: { select: { id: true, name: true } } },
    }),
  ])

  const revenue = salesToday.reduce((sum, s) => sum + Number(s.total), 0)

  return {
    todaySalesCount: salesToday.length,
    todayRevenue: revenue.toFixed(2),
    lowStock: lowStock.map((s) => ({
      productId: s.productId,
      productName: s.product.name,
      quantity: s.quantity,
    })),
  }
}

export async function getNetworkSummary(staff: AuthenticatedStaff) {
  if (staff.role !== StaffRole.OWNER) {
    return null
  }

  const shops = await prisma.shop.findMany({ orderBy: { name: 'asc' } })
  const summaries = await Promise.all(
    shops.map(async (shop) => {
      const summary = await getShopSummary(staff, shop.id)
      return { shopId: shop.id, shopName: shop.name, shopSlug: shop.slug, ...summary }
    }),
  )

  return summaries
}

async function computeFinancialSummary(shopId: string, from?: string, to?: string): Promise<FinancialSummary> {
  const { fromDate, toDate } = parseDateRange(from, to)

  const [sales, payments, clients, charges] = await Promise.all([
    prisma.sale.findMany({
      where: {
        shopId,
        status: SaleStatus.COMPLETED,
        createdAt: { gte: fromDate, lte: toDate },
      },
      select: { amountPaid: true },
    }),
    prisma.clientPayment.findMany({
      where: {
        shopId,
        status: ClientPaymentStatus.COMPLETED,
        createdAt: { gte: fromDate, lte: toDate },
      },
      select: { amount: true },
    }),
    prisma.client.findMany({
      where: { shopId },
      select: { balance: true },
    }),
    prisma.shopCharge.findMany({
      where: {
        shopId,
        status: ShopChargeStatus.ACTIVE,
        chargeDate: { gte: fromDate, lte: toDate },
      },
      select: { amount: true },
    }),
  ])

  const posCollected = sales.reduce((sum, s) => sum.add(s.amountPaid), new Decimal(0))
  const clientPaymentsReceived = payments.reduce((sum, p) => sum.add(p.amount), new Decimal(0))
  const outstandingCredit = clients.reduce((sum, c) => sum.add(c.balance), new Decimal(0))
  const totalCharges = charges.reduce((sum, c) => sum.add(c.amount), new Decimal(0))

  return {
    posCollected: posCollected.toFixed(2),
    clientPaymentsReceived: clientPaymentsReceived.toFixed(2),
    totalCashIn: posCollected.add(clientPaymentsReceived).toFixed(2),
    outstandingCredit: outstandingCredit.toFixed(2),
    totalCharges: totalCharges.toFixed(2),
  }
}

export async function getFinancialSummary(
  staff: AuthenticatedStaff,
  shopId: string,
  from?: string,
  to?: string,
) {
  assertShopAccess(staff, shopId)
  requireMinRole(staff, StaffRole.MANAGER)
  return computeFinancialSummary(shopId, from, to)
}

export async function getNetworkFinancialSummary(
  staff: AuthenticatedStaff,
  from?: string,
  to?: string,
) {
  if (staff.role !== StaffRole.OWNER) {
    throw new CustomError('ROLE_DENIED', 'Only owners can view network financial summary', 403)
  }

  const shops = await prisma.shop.findMany({ orderBy: { name: 'asc' } })
  const shopSummaries = await Promise.all(
    shops.map(async (shop) => {
      const summary = await computeFinancialSummary(shop.id, from, to)
      return { shopId: shop.id, shopName: shop.name, shopSlug: shop.slug, ...summary }
    }),
  )

  const totals = shopSummaries.reduce(
    (acc, shop) => ({
      posCollected: new Decimal(acc.posCollected).add(shop.posCollected).toFixed(2),
      clientPaymentsReceived: new Decimal(acc.clientPaymentsReceived)
        .add(shop.clientPaymentsReceived)
        .toFixed(2),
      totalCashIn: new Decimal(acc.totalCashIn).add(shop.totalCashIn).toFixed(2),
      outstandingCredit: new Decimal(acc.outstandingCredit)
        .add(shop.outstandingCredit)
        .toFixed(2),
      totalCharges: new Decimal(acc.totalCharges).add(shop.totalCharges).toFixed(2),
    }),
    {
      posCollected: '0.00',
      clientPaymentsReceived: '0.00',
      totalCashIn: '0.00',
      outstandingCredit: '0.00',
      totalCharges: '0.00',
    },
  )

  return { shops: shopSummaries, totals }
}

import { StaffRole } from '@prisma/client'
import prisma from '../../resources/database/initDatabase.js'
import { CustomError } from '../../shared/types/error_type.js'
import type { AuthenticatedStaff } from '../../shared/middlewares/shopScope.js'

export const RESET_CONFIRMATION = 'RESET'

export type ResetMode = 'delete' | 'zero'

export interface ResetInput {
  /** Delete every staff account except owners. */
  staff?: boolean
  /** `delete` removes stock rows, `zero` sets every quantity to 0. */
  stock?: ResetMode
  /** `delete` removes products + families, `zero` sets every price/cost to 0. */
  products?: ResetMode
  /** Delete online orders and POS sales. */
  orders?: boolean
  /** Delete clients (and the orders/sales they own). */
  clients?: boolean
  /** Delete credit portions, payments, ledger; every balance returns to 0. */
  credit?: boolean
  confirmation?: string
}

function mode(value: unknown, field: string): ResetMode | undefined {
  if (value === undefined || value === null || value === '') return undefined
  if (value === 'delete' || value === 'zero') return value
  throw new CustomError('VALIDATION_ERROR', `${field} must be "delete" or "zero"`, 400)
}

/**
 * Relations drive what else must go:
 * - deleting products removes every order/sale/transfer line that points to them, so those
 *   documents are removed too;
 * - deleting orders removes the sales behind credit portions, so credit data goes with them;
 * - deleting clients removes the orders/sales they own (the rest stay).
 */
export async function resetData(actor: AuthenticatedStaff, input: ResetInput) {
  if (actor.role !== StaffRole.OWNER) {
    throw new CustomError('FORBIDDEN', 'Only the owner can reset data', 403)
  }
  if (input.confirmation !== RESET_CONFIRMATION) {
    throw new CustomError('VALIDATION_ERROR', `Type ${RESET_CONFIRMATION} to confirm`, 400)
  }

  const staff = input.staff === true
  const stock = mode(input.stock, 'stock')
  const products = mode(input.products, 'products')
  const clients = input.clients === true
  const allOrders = input.orders === true || products === 'delete'
  const credit = input.credit === true || allOrders || clients

  if (!staff && !stock && !products && !allOrders && !clients && !credit) {
    throw new CustomError('VALIDATION_ERROR', 'Select at least one item to reset', 400)
  }

  const counts: Record<string, number> = {}

  await prisma.$transaction(
    async (tx) => {
      // Credit first: balances are rebuilt from scratch whenever sales may disappear.
      if (credit) {
        counts.creditPortions = (await tx.clientCreditPortion.deleteMany()).count
        counts.clientPayments = (await tx.clientPayment.deleteMany()).count
        counts.ledgerEntries = (await tx.clientLedgerEntry.deleteMany()).count
        counts.reminderContacts = (await tx.creditReminderContact.deleteMany()).count
        await tx.client.updateMany({ data: { balance: 0 } })
        // Remaining sales no longer owe anything.
        await tx.$executeRaw`UPDATE "Sale" SET "amountPaid" = "total", "amountOnCredit" = 0 WHERE "amountOnCredit" > 0`
      }

      if (allOrders) {
        counts.sales = (await tx.sale.deleteMany()).count
        counts.orders = (await tx.onlineOrder.deleteMany()).count
      } else if (clients) {
        counts.sales = (
          await tx.sale.deleteMany({
            where: { OR: [{ clientId: { not: null } }, { onlineOrder: { clientId: { not: null } } }] },
          })
        ).count
        counts.orders = (await tx.onlineOrder.deleteMany({ where: { clientId: { not: null } } })).count
      }

      if (clients) {
        counts.clients = (await tx.client.deleteMany()).count
      }

      if (products === 'delete') {
        counts.transfers = (await tx.inboundTransfer.deleteMany()).count
        counts.stock = (await tx.shopStock.deleteMany()).count
        counts.products = (await tx.product.deleteMany()).count
        counts.families = (await tx.productFamily.deleteMany()).count
      } else if (products === 'zero') {
        counts.products = (await tx.product.updateMany({ data: { sellPrice: 0, unitCost: 0 } })).count
      }

      if (stock === 'delete' && products !== 'delete') {
        counts.stock = (await tx.shopStock.deleteMany()).count
      } else if (stock === 'zero' && products !== 'delete') {
        counts.stock = (await tx.shopStock.updateMany({ data: { quantity: 0 } })).count
      }

      if (staff) {
        // Keep history: hand every record created by removed staff to the acting owner.
        const doomed = { role: { not: StaffRole.OWNER } }
        const gone = { in: (await tx.staffUser.findMany({ where: doomed, select: { id: true } })).map((s) => s.id) }
        if (gone.in.length > 0) {
          await tx.inboundTransfer.updateMany({ where: { recordedById: gone }, data: { recordedById: actor.id } })
          await tx.sale.updateMany({ where: { cashierId: gone }, data: { cashierId: actor.id } })
          await tx.sale.updateMany({ where: { cancelledById: gone }, data: { cancelledById: actor.id } })
          await tx.sale.updateMany({ where: { creditApprovedById: gone }, data: { creditApprovedById: actor.id } })
          await tx.onlineOrder.updateMany({ where: { cancelledById: gone }, data: { cancelledById: actor.id } })
          await tx.clientPayment.updateMany({ where: { recordedById: gone }, data: { recordedById: actor.id } })
          await tx.clientPayment.updateMany({ where: { cancelledById: gone }, data: { cancelledById: actor.id } })
          await tx.shopCharge.updateMany({ where: { recordedById: gone }, data: { recordedById: actor.id } })
          await tx.shopCharge.updateMany({ where: { cancelledById: gone }, data: { cancelledById: actor.id } })
          await tx.clientLedgerEntry.updateMany({ where: { recordedById: gone }, data: { recordedById: actor.id } })
          await tx.creditReminderContact.updateMany({ where: { contactedById: gone }, data: { contactedById: actor.id } })
        }
        counts.staff = (await tx.staffUser.deleteMany({ where: doomed })).count
      }
    },
    { timeout: 120_000, maxWait: 10_000 },
  )

  return counts
}

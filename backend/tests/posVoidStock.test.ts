import { describe, it, expect, vi, beforeEach } from 'vitest'
import { SaleStatus, StaffRole } from '@prisma/client'
import { CustomError } from '../src/shared/types/error_type.js'

const mockRestoreShopStock = vi.fn()
const mockTransaction = vi.fn()

const mockPrisma = {
  $transaction: mockTransaction,
}

vi.mock('../src/shared/stock/stockMutations.js', () => ({
  restoreShopStock: (...args: unknown[]) => mockRestoreShopStock(...args),
}))

vi.mock('../src/resources/database/initDatabase.js', () => ({
  default: mockPrisma,
}))

describe('voidSale stock restoration', () => {
  const staff = { id: 'cashier-1', role: StaffRole.CASHIER, shopIds: ['shop-1'] }
  const sale = {
    id: 'sale-1',
    shopId: 'shop-1',
    cashierId: 'cashier-1',
    status: SaleStatus.COMPLETED,
    createdAt: new Date(),
    onlineOrderId: null,
    amountOnCredit: { gt: () => false },
    clientId: null,
    creditPortions: [],
    lines: [{ productId: 'prod-1', quantity: 2 }],
  }

  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('restores stock only once when void succeeds', async () => {
    const tx = {
      sale: {
        findFirst: vi.fn().mockResolvedValue(sale),
        updateMany: vi.fn().mockResolvedValue({ count: 1 }),
        findFirstOrThrow: vi.fn().mockResolvedValue({ ...sale, status: SaleStatus.CANCELLED }),
      },
    }
    mockTransaction.mockImplementation(async (fn: (inner: typeof tx) => Promise<unknown>) => fn(tx))

    const { voidSale } = await import('../src/modules/pos/service.js')
    await voidSale(staff as never, 'shop-1', 'sale-1')

    expect(mockRestoreShopStock).toHaveBeenCalledTimes(1)
    expect(mockRestoreShopStock).toHaveBeenCalledWith(tx, 'shop-1', [{ productId: 'prod-1', quantity: 2 }])
  })

  it('throws ALREADY_VOIDED and does not restore stock on second void', async () => {
    const tx = {
      sale: {
        findFirst: vi.fn().mockResolvedValue({ ...sale, status: SaleStatus.CANCELLED }),
        updateMany: vi.fn().mockResolvedValue({ count: 0 }),
        findFirstOrThrow: vi.fn(),
      },
    }
    mockTransaction.mockImplementation(async (fn: (inner: typeof tx) => Promise<unknown>) => fn(tx))

    const { voidSale } = await import('../src/modules/pos/service.js')

    await expect(voidSale(staff as never, 'shop-1', 'sale-1')).rejects.toThrow(CustomError)
    expect(mockRestoreShopStock).not.toHaveBeenCalled()
  })

  it('skips stock restore for online fulfillment sales', async () => {
    const onlineSale = {
      ...sale,
      onlineOrderId: 'order-1',
    }
    const tx = {
      sale: {
        findFirst: vi.fn().mockResolvedValue(onlineSale),
        updateMany: vi.fn().mockResolvedValue({ count: 1 }),
        findFirstOrThrow: vi.fn().mockResolvedValue({ ...onlineSale, status: SaleStatus.CANCELLED }),
      },
    }
    mockTransaction.mockImplementation(async (fn: (inner: typeof tx) => Promise<unknown>) => fn(tx))

    const { voidSale } = await import('../src/modules/pos/service.js')
    await voidSale(staff as never, 'shop-1', 'sale-1')

    expect(mockRestoreShopStock).not.toHaveBeenCalled()
  })
})

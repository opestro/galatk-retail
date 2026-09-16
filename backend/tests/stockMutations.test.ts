import { describe, it, expect, vi, beforeEach } from 'vitest'
import { decrementShopStock, restoreShopStock, setShopStockQuantity } from '../src/shared/stock/stockMutations.js'
import { CustomError } from '../src/shared/types/error_type.js'

const mockStock = { id: 'stock-1', shopId: 'shop-1', productId: 'prod-1', quantity: 10 }

function createTx(overrides: Record<string, unknown> = {}) {
  return {
    shopStock: {
      findUnique: vi.fn().mockResolvedValue(mockStock),
      update: vi.fn().mockResolvedValue({ ...mockStock, quantity: 8 }),
      create: vi.fn(),
    },
    ...overrides,
  }
}

describe('decrementShopStock', () => {
  it('decrements quantity when stock is sufficient', async () => {
    const tx = createTx()
    await decrementShopStock(tx as never, 'shop-1', [{ productId: 'prod-1', quantity: 2 }])
    expect(tx.shopStock.update).toHaveBeenCalledWith({
      where: { id: 'stock-1' },
      data: { quantity: 8 },
    })
  })

  it('throws 409 when stock is insufficient', async () => {
    const tx = createTx()
    await expect(
      decrementShopStock(tx as never, 'shop-1', [{ productId: 'prod-1', quantity: 20 }]),
    ).rejects.toThrow(CustomError)
  })

  it('throws 409 when stock record missing', async () => {
    const tx = createTx({
      shopStock: { findUnique: vi.fn().mockResolvedValue(null), update: vi.fn(), create: vi.fn() },
    })
    await expect(
      decrementShopStock(tx as never, 'shop-1', [{ productId: 'prod-1', quantity: 1 }]),
    ).rejects.toThrow(CustomError)
  })
})

describe('restoreShopStock', () => {
  it('increments existing stock', async () => {
    const tx = createTx()
    await restoreShopStock(tx as never, 'shop-1', [{ productId: 'prod-1', quantity: 3 }])
    expect(tx.shopStock.update).toHaveBeenCalledWith({
      where: { id: 'stock-1' },
      data: { quantity: 13 },
    })
  })

  it('creates stock record when missing', async () => {
    const tx = createTx({
      shopStock: {
        findUnique: vi.fn().mockResolvedValue(null),
        update: vi.fn(),
        create: vi.fn(),
      },
    })
    await restoreShopStock(tx as never, 'shop-1', [{ productId: 'prod-1', quantity: 5 }])
    expect(tx.shopStock.create).toHaveBeenCalledWith({
      data: { shopId: 'shop-1', productId: 'prod-1', quantity: 5 },
    })
  })
})

describe('setShopStockQuantity', () => {
  it('updates an existing stock row to the exact quantity', async () => {
    const tx = createTx()
    const next = await setShopStockQuantity(tx as never, 'shop-1', 'prod-1', 0)
    expect(next).toBe(0)
    expect(tx.shopStock.update).toHaveBeenCalledWith({
      where: { id: 'stock-1' },
      data: { quantity: 0 },
    })
  })

  it('creates a stock row when none exists', async () => {
    const tx = createTx({
      shopStock: {
        findUnique: vi.fn().mockResolvedValue(null),
        update: vi.fn(),
        create: vi.fn().mockResolvedValue({ quantity: 8 }),
      },
    })
    await setShopStockQuantity(tx as never, 'shop-1', 'prod-1', 8)
    expect(tx.shopStock.create).toHaveBeenCalledWith({
      data: { shopId: 'shop-1', productId: 'prod-1', quantity: 8 },
    })
  })
})

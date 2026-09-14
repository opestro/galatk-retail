import { describe, it, expect, vi, beforeEach } from 'vitest'
import { CustomError } from '../src/shared/types/error_type.js'

const mockIncrementShopStock = vi.fn()

vi.mock('../src/shared/stock/stockMutations.js', () => ({
  incrementShopStock: (...args: unknown[]) => mockIncrementShopStock(...args),
}))

const family = {
  id: 'fam-baggy',
  name: 'Baggy',
  slug: 'baggy',
  description: null,
  isActive: true,
  availableOnline: true,
  createdAt: new Date(),
  updatedAt: new Date(),
  images: [],
  products: [],
}

const existingSku = {
  id: 'sku-vert-m',
  familyId: 'fam-baggy',
  attributesKey: 'color:vert|size:m',
  attributes: { color: 'Vert', size: 'M' },
  isActive: true,
  availableOnline: true,
  unitCost: 1000,
  sellPrice: 2500,
}

const mockPrisma = {
  productFamily: {
    findUnique: vi.fn(),
    update: vi.fn(),
  },
  product: {
    findFirst: vi.fn(),
    findUnique: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    findUniqueOrThrow: vi.fn(),
  },
  shopStock: { findMany: vi.fn() },
  $transaction: vi.fn(),
}

vi.mock('../src/resources/database/initDatabase.js', () => ({
  default: mockPrisma,
}))

describe('upsertFamilyVariant', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockPrisma.productFamily.findUnique.mockResolvedValue(family)
    mockPrisma.$transaction.mockImplementation(async (fn: (tx: typeof mockPrisma) => unknown) => fn(mockPrisma as never))
  })

  it('reuses an existing attribute combination and inbounds extra quantity', async () => {
    mockPrisma.product.findFirst.mockResolvedValue(existingSku)
    mockPrisma.product.update.mockResolvedValue({ ...existingSku, sellPrice: 2500 })

    const { upsertFamilyVariant } = await import('../src/modules/products/service.js')
    const result = await upsertFamilyVariant('fam-baggy', {
      attributes: { color: 'Vert', size: 'M' },
      sellPrice: 2500,
      quantity: 5,
      shopId: 'shop-1',
    })

    expect(result.created).toBe(false)
    expect(mockPrisma.product.create).not.toHaveBeenCalled()
    expect(mockIncrementShopStock).toHaveBeenCalledWith(mockPrisma, 'shop-1', [
      { productId: 'sku-vert-m', quantity: 5 },
    ])
  })

  it('creates a new variant when the combination is new', async () => {
    mockPrisma.product.findFirst.mockResolvedValue(null)
    mockPrisma.product.create.mockResolvedValue({ id: 'sku-blanc-m', familyId: 'fam-baggy' })

    const { upsertFamilyVariant } = await import('../src/modules/products/service.js')
    const result = await upsertFamilyVariant('fam-baggy', {
      attributes: { color: 'Blanc', size: 'M' },
      unitCost: 1000,
      sellPrice: 2400,
      quantity: 10,
      shopId: 'shop-1',
    })

    expect(result.created).toBe(true)
    expect(mockPrisma.product.create).toHaveBeenCalled()
    expect(mockIncrementShopStock).toHaveBeenCalledWith(mockPrisma, 'shop-1', [
      { productId: 'sku-blanc-m', quantity: 10 },
    ])
  })

  it('rejects editing into a duplicate combination', async () => {
    mockPrisma.product.findUnique.mockResolvedValue({
      ...existingSku,
      id: 'sku-vert-l',
      attributesKey: 'color:vert|size:l',
      family: family,
    })
    mockPrisma.product.findFirst.mockResolvedValue(existingSku)

    const { updateProduct } = await import('../src/modules/products/service.js')
    await expect(
      updateProduct('sku-vert-l', { attributes: { color: 'Vert', size: 'M' } }),
    ).rejects.toBeInstanceOf(CustomError)
  })
})

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { CustomError } from '../src/shared/types/error_type.js'

const mockPrisma = {
  productFamily: {
    findUnique: vi.fn(),
  },
  productImage: {
    findMany: vi.fn(),
    update: vi.fn(),
    findUniqueOrThrow: vi.fn(),
  },
  $transaction: vi.fn(),
}

vi.mock('../src/resources/database/initDatabase.js', () => ({
  default: mockPrisma,
}))

vi.mock('../src/shared/stock/stockMutations.js', () => ({
  incrementShopStock: vi.fn(),
  setShopStockQuantity: vi.fn(),
}))

describe('setPrimaryFamilyImage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockPrisma.productFamily.findUnique.mockResolvedValue({
      id: 'fam-1',
      name: 'Cotton',
      images: [],
      products: [],
    })
    mockPrisma.$transaction.mockImplementation(async (ops: Promise<unknown>[]) => Promise.all(ops))
    mockPrisma.productImage.update.mockImplementation(async ({ where, data }: { where: { id: string }; data: { sortOrder: number } }) => ({
      id: where.id,
      sortOrder: data.sortOrder,
    }))
  })

  it('reorders images so the chosen one is first (store primary)', async () => {
    mockPrisma.productImage.findMany.mockResolvedValue([
      { id: 'img-a', sortOrder: 0 },
      { id: 'img-b', sortOrder: 1 },
    ])
    mockPrisma.productImage.findUniqueOrThrow.mockResolvedValue({ id: 'img-b', sortOrder: 0 })

    const { setPrimaryFamilyImage } = await import('../src/modules/products/service.js')
    const result = await setPrimaryFamilyImage('fam-1', 'img-b')

    expect(result.id).toBe('img-b')
    expect(mockPrisma.productImage.update).toHaveBeenNthCalledWith(1, {
      where: { id: 'img-b' },
      data: { sortOrder: 0 },
    })
    expect(mockPrisma.productImage.update).toHaveBeenNthCalledWith(2, {
      where: { id: 'img-a' },
      data: { sortOrder: 1 },
    })
  })

  it('rejects an image that does not belong to the family', async () => {
    mockPrisma.productImage.findMany.mockResolvedValue([{ id: 'img-a', sortOrder: 0 }])
    const { setPrimaryFamilyImage } = await import('../src/modules/products/service.js')
    await expect(setPrimaryFamilyImage('fam-1', 'missing')).rejects.toBeInstanceOf(CustomError)
  })
})

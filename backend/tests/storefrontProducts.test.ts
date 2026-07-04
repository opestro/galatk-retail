import { describe, it, expect, vi, beforeEach } from 'vitest'
import { OutOfStockDisplay } from '@prisma/client'

const mockPrisma = {
  shop: { findUnique: vi.fn() },
  shopStock: { findMany: vi.fn() },
}

vi.mock('../src/resources/database/initDatabase.js', () => ({
  default: mockPrisma,
}))

describe('listStorefrontProducts', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockPrisma.shop.findUnique.mockResolvedValue({
      id: 'shop-1',
      slug: 'main-shop',
      outOfStockDisplay: OutOfStockDisplay.SHOW_UNAVAILABLE,
    })
  })

  it('includes products with availableOnline true and stock', async () => {
    mockPrisma.shopStock.findMany.mockResolvedValue([
      {
        productId: 'p1',
        quantity: 5,
        product: {
          name: 'Factory Shirt',
          description: null,
          sellPrice: { toString: () => '2500' },
        },
      },
    ])

    const { listStorefrontProducts } = await import('../src/modules/storefront/service.js')
    const products = await listStorefrontProducts('main-shop')

    expect(products).toHaveLength(1)
    expect(products[0]?.name).toBe('Factory Shirt')
    expect(products[0]?.inStock).toBe(true)
    expect(mockPrisma.shopStock.findMany).toHaveBeenCalledWith({
      where: {
        shopId: 'shop-1',
        product: { isActive: true, availableOnline: true },
      },
      include: { product: true },
    })
  })
})

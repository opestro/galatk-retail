import { describe, it, expect, vi, beforeEach } from 'vitest'
import { FulfillmentType, OrderStatus } from '@prisma/client'

const mockPrisma = {
  shop: { findMany: vi.fn() },
}

const mockCheckoutForShop = vi.fn()

vi.mock('../src/resources/database/initDatabase.js', () => ({
  default: mockPrisma,
}))

vi.mock('../src/modules/storefront/service.js', () => ({
  checkoutForShop: mockCheckoutForShop,
}))

describe('globalCheckout', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  const baseInput = {
    fulfillmentType: FulfillmentType.PICKUP,
    customerName: 'Jane Doe',
    customerPhone: '+212600000099',
  }

  it('rejects an empty cart', async () => {
    const { globalCheckout } = await import('../src/modules/global-store/service.js')

    await expect(globalCheckout({ ...baseInput, lines: [] })).rejects.toMatchObject({
      type: 'VALIDATION_ERROR',
    })
  })

  it('rejects a cart line missing shopId', async () => {
    const { globalCheckout } = await import('../src/modules/global-store/service.js')

    await expect(
      globalCheckout({
        ...baseInput,
        lines: [{ productId: 'p1', shopId: '', quantity: 1 }],
      }),
    ).rejects.toMatchObject({ type: 'VALIDATION_ERROR' })
  })

  it('throws SHOP_NOT_FOUND when a cart references an unknown shop', async () => {
    mockPrisma.shop.findMany.mockResolvedValue([{ id: 'shop-1', slug: 'main-shop' }])

    const { globalCheckout } = await import('../src/modules/global-store/service.js')

    await expect(
      globalCheckout({
        ...baseInput,
        lines: [{ productId: 'p1', shopId: 'shop-missing', quantity: 1 }],
      }),
    ).rejects.toMatchObject({ type: 'SHOP_NOT_FOUND' })
  })

  it('splits a multi-shop cart into one order per shop', async () => {
    mockPrisma.shop.findMany.mockResolvedValue([
      { id: 'shop-1', slug: 'main-shop', serviceCity: 'Algiers' },
      { id: 'shop-2', slug: 'branch-shop', serviceCity: 'Oran' },
    ])

    mockCheckoutForShop.mockImplementation(async (shop: { id: string }) => ({
      id: `order-${shop.id}`,
      shopId: shop.id,
      orderNumber: `ORD-${shop.id}`,
      total: { toString: () => '1000' },
      status: OrderStatus.PLACED,
    }))

    const { globalCheckout } = await import('../src/modules/global-store/service.js')

    const orders = await globalCheckout({
      ...baseInput,
      lines: [
        { productId: 'p1', shopId: 'shop-1', quantity: 2 },
        { productId: 'p2', shopId: 'shop-2', quantity: 1 },
      ],
    })

    expect(orders).toHaveLength(2)
    expect(mockCheckoutForShop).toHaveBeenCalledTimes(2)
    expect(orders.map((o) => o.shopId).sort()).toEqual(['shop-1', 'shop-2'])
  })

  it('groups multiple lines for the same shop into a single order', async () => {
    mockPrisma.shop.findMany.mockResolvedValue([{ id: 'shop-1', slug: 'main-shop', serviceCity: 'Algiers' }])

    mockCheckoutForShop.mockImplementation(async (shop: { id: string }) => ({
      id: `order-${shop.id}`,
      shopId: shop.id,
      orderNumber: `ORD-${shop.id}`,
      total: { toString: () => '1000' },
      status: OrderStatus.PLACED,
    }))

    const { globalCheckout } = await import('../src/modules/global-store/service.js')

    const orders = await globalCheckout({
      ...baseInput,
      lines: [
        { productId: 'p1', shopId: 'shop-1', quantity: 2 },
        { productId: 'p2', shopId: 'shop-1', quantity: 3 },
      ],
    })

    expect(orders).toHaveLength(1)
    expect(mockCheckoutForShop).toHaveBeenCalledTimes(1)
    const checkoutInput = mockCheckoutForShop.mock.calls[0][1]
    expect(checkoutInput.lines).toHaveLength(2)
  })
})

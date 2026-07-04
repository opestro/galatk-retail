import { describe, it, expect, vi, beforeEach } from 'vitest'
import { CustomError } from '../src/shared/types/error_type.js'

const mockIncrementShopStock = vi.fn()

vi.mock('../src/shared/stock/stockMutations.js', () => ({
  incrementShopStock: (...args: unknown[]) => mockIncrementShopStock(...args),
}))

const mockPrisma = {
  shop: { findUnique: vi.fn() },
  staffUser: { findUnique: vi.fn() },
  inboundTransfer: { findFirst: vi.fn() },
  product: { findFirst: vi.fn(), create: vi.fn(), update: vi.fn() },
  $transaction: vi.fn(),
}

vi.mock('../src/resources/database/initDatabase.js', () => ({
  default: mockPrisma,
}))

describe('createIntegrationInboundTransfer', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    process.env.GALATK_INTEGRATION_STAFF_ID = 'staff-integration'
    process.env.GALATK_INTEGRATION_API_KEY = 'test-key'
    mockPrisma.inboundTransfer.findFirst.mockResolvedValue(null)
    mockPrisma.shop.findUnique.mockResolvedValue({ id: 'shop-1', name: 'Main Shop' })
    mockPrisma.staffUser.findUnique.mockResolvedValue({ id: 'staff-integration' })
  })

  it('auto-creates product when galatkProductRef is unknown', async () => {
    mockPrisma.product.findFirst.mockResolvedValue(null)
    mockPrisma.product.create.mockResolvedValue({
      id: 'retail-prod-1',
      name: 'Factory Shirt',
    })
    mockPrisma.$transaction.mockImplementation(async (fn: (tx: typeof mockPrisma) => unknown) => {
      const tx = {
        product: mockPrisma.product,
        inboundTransfer: {
          create: vi.fn().mockResolvedValue({
            id: 'transfer-1',
            shopId: 'shop-1',
            galatkTransferRef: 'dispatch-1',
            note: null,
            createdAt: new Date(),
            lines: [],
          }),
        },
      }
      return fn(tx as never)
    })

    const { createIntegrationInboundTransfer } = await import('../src/modules/integrations/service.js')

    const result = await createIntegrationInboundTransfer('shop-1', {
      galatkTransferRef: 'dispatch-1',
      lines: [
        {
          galatkProductRef: 'galatk-prod-1',
          quantity: 4,
          name: 'Factory Shirt',
          unitCost: '25',
          sellPrice: '25',
        },
      ],
    })

    expect(mockPrisma.product.create).toHaveBeenCalledWith({
      data: {
        name: 'Factory Shirt',
        unitCost: '25',
        sellPrice: '25',
        galatkProductRef: 'galatk-prod-1',
        isActive: true,
        availableOnline: true,
      },
    })
    expect(mockIncrementShopStock).toHaveBeenCalled()
    expect(result.created).toBe(true)
  })

  it('updates unitCost on existing product without changing sellPrice', async () => {
    mockPrisma.product.findFirst.mockResolvedValue({
      id: 'existing-prod',
      name: 'Old Name',
      sellPrice: { toString: () => '3000' },
    })
    mockPrisma.product.update.mockResolvedValue({ id: 'existing-prod' })
    mockPrisma.$transaction.mockImplementation(async (fn: (tx: typeof mockPrisma) => unknown) => {
      const tx = {
        product: mockPrisma.product,
        inboundTransfer: {
          create: vi.fn().mockResolvedValue({ id: 'transfer-2', lines: [] }),
        },
      }
      return fn(tx as never)
    })

    const { createIntegrationInboundTransfer } = await import('../src/modules/integrations/service.js')

    await createIntegrationInboundTransfer('shop-1', {
      galatkTransferRef: 'dispatch-2',
      lines: [
        {
          galatkProductRef: 'galatk-prod-1',
          quantity: 2,
          name: 'Factory Shirt',
          unitCost: '25',
        },
      ],
    })

    expect(mockPrisma.product.update).toHaveBeenCalledWith({
      where: { id: 'existing-prod' },
      data: { name: 'Factory Shirt', unitCost: '25' },
    })
    expect(mockPrisma.product.create).not.toHaveBeenCalled()
  })

  it('returns existing transfer for duplicate galatkTransferRef', async () => {
    const existing = {
      id: 'transfer-existing',
      shopId: 'shop-1',
      galatkTransferRef: 'dispatch-1',
      note: null,
      createdAt: new Date(),
      lines: [],
    }
    mockPrisma.inboundTransfer.findFirst.mockResolvedValue(existing)

    const { createIntegrationInboundTransfer } = await import('../src/modules/integrations/service.js')

    const result = await createIntegrationInboundTransfer('shop-1', {
      galatkTransferRef: 'dispatch-1',
      lines: [
        {
          galatkProductRef: 'galatk-prod-1',
          quantity: 1,
          name: 'Factory Shirt',
          unitCost: '25',
        },
      ],
    })

    expect(result.created).toBe(false)
    expect(result.transfer).toBe(existing)
    expect(mockPrisma.$transaction).not.toHaveBeenCalled()
  })

  it('rejects invalid lines', async () => {
    const { createIntegrationInboundTransfer } = await import('../src/modules/integrations/service.js')

    await expect(
      createIntegrationInboundTransfer('shop-1', {
        galatkTransferRef: 'dispatch-1',
        lines: [],
      }),
    ).rejects.toThrow(CustomError)
  })
})

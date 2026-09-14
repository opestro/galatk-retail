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
  productFamily: { findUnique: vi.fn(), create: vi.fn() },
  $transaction: vi.fn(),
}

vi.mock('../src/resources/database/initDatabase.js', () => ({
  default: mockPrisma,
}))

function stubCatalogFamily() {
  mockPrisma.productFamily.findUnique.mockResolvedValue(null)
  mockPrisma.productFamily.create.mockImplementation(async ({ data }: { data: Record<string, unknown> }) => ({
    id: `family-${String(data.slug)}`,
    ...data,
  }))
}

describe('createIntegrationInboundTransfer', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    process.env.GALATK_INTEGRATION_STAFF_ID = 'staff-integration'
    process.env.GALATK_INTEGRATION_API_KEY = 'test-key'
    mockPrisma.inboundTransfer.findFirst.mockResolvedValue(null)
    mockPrisma.shop.findUnique.mockResolvedValue({ id: 'shop-1', name: 'Main Shop' })
    mockPrisma.staffUser.findUnique.mockResolvedValue({ id: 'staff-integration' })
    stubCatalogFamily()
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
        productFamily: mockPrisma.productFamily,
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
        category: 'Factory',
        variantLabel: 'Shirt',
        familyId: 'family-factory',
        attributes: { color: 'Shirt' },
        attributesKey: 'color:shirt',
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
        productFamily: mockPrisma.productFamily,
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
      data: {
        name: 'Factory Shirt',
        unitCost: '25',
        category: 'Factory',
        variantLabel: 'Shirt',
        familyId: 'family-factory',
        attributes: { color: 'Shirt' },
        attributesKey: 'color:shirt',
      },
    })
    expect(mockPrisma.product.create).not.toHaveBeenCalled()
  })

  it('passes workshop family on inbound so variants stay under that category', async () => {
    mockPrisma.product.findFirst.mockResolvedValue(null)
    mockPrisma.product.create.mockResolvedValue({ id: 'retail-prod-2' })
    mockPrisma.$transaction.mockImplementation(async (fn: (tx: typeof mockPrisma) => unknown) => {
      const tx = {
        product: mockPrisma.product,
        productFamily: mockPrisma.productFamily,
        inboundTransfer: {
          create: vi.fn().mockResolvedValue({ id: 'transfer-family', lines: [] }),
        },
      }
      return fn(tx as never)
    })

    const { createIntegrationInboundTransfer } = await import('../src/modules/integrations/service.js')

    await createIntegrationInboundTransfer('shop-1', {
      galatkTransferRef: 'dispatch-family',
      lines: [
        {
          galatkProductRef: 'galatk-tee-xl',
          quantity: 3,
          name: 'T-shirt XL noir',
          unitCost: '80',
          sellPrice: '80',
          category: 'T-shirt',
        },
      ],
    })

    expect(mockPrisma.product.create).toHaveBeenCalledWith({
      data: {
        name: 'T-shirt XL noir',
        unitCost: '80',
        sellPrice: '80',
        galatkProductRef: 'galatk-tee-xl',
        category: 'T-shirt',
        variantLabel: 'XL noir',
        familyId: 'family-t shirt',
        attributes: { size: 'XL', color: 'Noir' },
        attributesKey: 'color:noir|size:xl',
        isActive: true,
        availableOnline: true,
      },
    })
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
})

describe('upsertIntegrationProduct', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    stubCatalogFamily()
  })

  it('creates a catalog product when galatkProductRef is new', async () => {
    mockPrisma.product.findFirst.mockResolvedValue(null)
    mockPrisma.product.create.mockResolvedValue({
      id: 'retail-prod-1',
      name: 'New Dress',
      galatkProductRef: 'galatk-1',
      unitCost: { toString: () => '40' },
      sellPrice: { toString: () => '40' },
      isActive: true,
      availableOnline: true,
    })

    const { upsertIntegrationProduct } = await import('../src/modules/integrations/service.js')
    const product = await upsertIntegrationProduct({
      galatkProductRef: 'galatk-1',
      name: 'New Dress',
      unitCost: '40',
    })

    expect(mockPrisma.product.create).toHaveBeenCalledWith({
      data: {
        name: 'New Dress',
        unitCost: '40',
        sellPrice: '40',
        galatkProductRef: 'galatk-1',
        category: 'New',
        variantLabel: 'Dress',
        familyId: 'family-new',
        attributes: { color: 'Dress' },
        attributesKey: 'color:dress',
        isActive: true,
        availableOnline: true,
      },
    })
    expect(product.id).toBe('retail-prod-1')
  })

  it('updates name and unitCost when galatkProductRef already exists', async () => {
    mockPrisma.product.findFirst.mockResolvedValue({ id: 'existing-prod' })
    mockPrisma.product.update.mockResolvedValue({ id: 'existing-prod', name: 'Renamed' })

    const { upsertIntegrationProduct } = await import('../src/modules/integrations/service.js')
    await upsertIntegrationProduct({
      galatkProductRef: 'galatk-1',
      name: 'Renamed',
      unitCost: '55',
      sellPrice: '99',
    })

    expect(mockPrisma.product.update).toHaveBeenCalledWith({
      where: { id: 'existing-prod' },
      data: {
        name: 'Renamed',
        unitCost: '55',
        category: 'Renamed',
        variantLabel: null,
        familyId: 'family-renamed',
        attributes: {},
        attributesKey: 'default',
      },
    })
    expect(mockPrisma.product.create).not.toHaveBeenCalled()
  })

  it('keeps existing retail family when category hint is omitted on update', async () => {
    mockPrisma.product.findFirst.mockResolvedValue({
      id: 'existing-prod',
      category: 'T-shirt',
      name: 'T-shirt XL',
    })
    mockPrisma.product.update.mockResolvedValue({ id: 'existing-prod' })

    const { upsertIntegrationProduct } = await import('../src/modules/integrations/service.js')
    await upsertIntegrationProduct({
      galatkProductRef: 'galatk-1',
      name: 'T-shirt noir L',
      unitCost: '80',
    })

    expect(mockPrisma.product.update).toHaveBeenCalledWith({
      where: { id: 'existing-prod' },
      data: {
        name: 'T-shirt noir L',
        unitCost: '80',
        category: 'T-shirt',
        variantLabel: 'noir L',
        familyId: 'family-t shirt',
        attributes: { color: 'Noir', size: 'L' },
        attributesKey: 'color:noir|size:l',
      },
    })
  })

  it('rejects missing identity fields', async () => {
    const { upsertIntegrationProduct } = await import('../src/modules/integrations/service.js')
    await expect(
      upsertIntegrationProduct({ galatkProductRef: '', name: 'X', unitCost: '1' }),
    ).rejects.toThrow(CustomError)
  })
})

describe('createIntegrationInboundTransfer validation', () => {
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

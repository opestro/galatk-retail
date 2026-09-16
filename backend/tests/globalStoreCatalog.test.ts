import { describe, it, expect, vi, beforeEach } from 'vitest'
import { OutOfStockDisplay } from '@prisma/client'
import { presentCatalogFamily, toCatalogSummary } from '../src/modules/global-store/presenter.js'

function money(value: string) {
  return { toString: () => value }
}

function shop(id: string, name: string, display: OutOfStockDisplay = OutOfStockDisplay.SHOW_UNAVAILABLE) {
  return {
    id,
    name,
    slug: id,
    address: '',
    contactPhone: null,
    serviceCity: 'Algiers',
    deliveryFee: money('500'),
    outOfStockDisplay: display,
    creditReminderDays: 30,
    createdAt: new Date(),
    updatedAt: new Date(),
  }
}

function family(overrides: Record<string, unknown> = {}) {
  return {
    id: 'fam-baggy',
    name: 'Baggy',
    slug: 'baggy',
    description: 'Oversized trousers',
    isActive: true,
    availableOnline: true,
    createdAt: new Date(),
    updatedAt: new Date(),
    images: [
      { id: 'img-1', familyId: 'fam-baggy', filename: 'a.jpg', url: '/uploads/product-images/a.jpg', mimeType: 'image/jpeg', sortOrder: 0, createdAt: new Date() },
      { id: 'img-2', familyId: 'fam-baggy', filename: 'b.jpg', url: '/uploads/product-images/b.jpg', mimeType: 'image/jpeg', sortOrder: 1, createdAt: new Date() },
    ],
    products: [
      {
        id: 'sku-vert-m',
        name: 'Baggy M Vert',
        description: null,
        unitCost: money('800'),
        sellPrice: money('2500'),
        galatkProductRef: 'secret',
        category: 'Baggy',
        variantLabel: 'M Vert',
        familyId: 'fam-baggy',
        attributes: { color: 'Vert', size: 'M' },
        attributesKey: 'color:vert|size:m',
        isActive: true,
        availableOnline: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        id: 'sku-blanc-m',
        name: 'Baggy M Blanc',
        description: null,
        unitCost: money('800'),
        sellPrice: money('2400'),
        galatkProductRef: null,
        category: 'Baggy',
        variantLabel: 'M Blanc',
        familyId: 'fam-baggy',
        attributes: { color: 'Blanc', size: 'M' },
        attributesKey: 'color:blanc|size:m',
        isActive: true,
        availableOnline: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    ],
    ...overrides,
  }
}

describe('presentCatalogFamily', () => {
  const main = shop('shop-1', 'Main Shop')
  const shopById = new Map([[main.id, main]])
  const stock = [
    { id: 'st1', shopId: 'shop-1', productId: 'sku-vert-m', quantity: 20 },
    { id: 'st2', shopId: 'shop-1', productId: 'sku-blanc-m', quantity: 10 },
  ]

  it('groups variants under the family and hides unit cost', () => {
    const presented = presentCatalogFamily(family() as never, stock as never, shopById)
    expect(presented).not.toBeNull()
    expect(presented?.name).toBe('Baggy')
    expect(presented?.fromPrice).toBe('2400')
    expect(presented?.hasPriceRange).toBe(true)
    expect(presented?.images[0]?.url).toContain('a.jpg')
    expect(JSON.stringify(presented)).not.toContain('unitCost')
    expect(JSON.stringify(presented)).not.toContain('800')
    expect(presented?.variants).toHaveLength(2)
  })

  it('omits unpublished or inactive families', () => {
    expect(presentCatalogFamily(family({ availableOnline: false }) as never, stock as never, shopById)).toBeNull()
    expect(presentCatalogFamily(family({ isActive: false }) as never, stock as never, shopById)).toBeNull()
  })

  it('omits variants that are offline or inactive', () => {
    const data = family() as never
    ;(data as { products: Array<{ availableOnline: boolean }> }).products[0].availableOnline = false
    const presented = presentCatalogFamily(data, stock as never, shopById)
    expect(presented?.variants.map((v) => v.id)).toEqual(['sku-blanc-m'])
  })

  it('drops the family when no variant is associated with a visible shop', () => {
    expect(presentCatalogFamily(family() as never, [], shopById)).toBeNull()
  })

  it('hides zero-stock shops when the shop is configured to hide them', () => {
    const hideShop = shop('shop-1', 'Main Shop', OutOfStockDisplay.HIDE)
    const presented = presentCatalogFamily(
      family() as never,
      [{ id: 'st1', shopId: 'shop-1', productId: 'sku-vert-m', quantity: 0 }] as never,
      new Map([[hideShop.id, hideShop]]),
    )
    expect(presented).toBeNull()
  })

  it('toCatalogSummary strips variant arrays for listing', () => {
    const presented = presentCatalogFamily(family() as never, stock as never, shopById)!
    const summary = toCatalogSummary(presented)
    expect('variants' in summary).toBe(false)
    expect(summary.fromPrice).toBe('2400')
  })
})

const mockPrisma = {
  shop: { findMany: vi.fn() },
  productFamily: { findMany: vi.fn(), findFirst: vi.fn(), findUnique: vi.fn() },
  shopStock: { findMany: vi.fn() },
  product: { findUnique: vi.fn() },
}

vi.mock('../src/resources/database/initDatabase.js', () => ({
  default: mockPrisma,
}))

vi.mock('../src/modules/storefront/service.js', () => ({
  checkoutForShop: vi.fn(),
}))

describe('listGlobalProducts / getGlobalProduct', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockPrisma.shop.findMany.mockResolvedValue([shop('shop-1', 'Main Shop')])
    mockPrisma.productFamily.findMany.mockResolvedValue([family()])
    mockPrisma.shopStock.findMany.mockResolvedValue([
      { id: 'st1', shopId: 'shop-1', productId: 'sku-vert-m', quantity: 20 },
      { id: 'st2', shopId: 'shop-1', productId: 'sku-blanc-m', quantity: 10 },
    ])
  })

  it('lists published families rather than individual SKUs', async () => {
    const { listGlobalProducts } = await import('../src/modules/global-store/service.js')
    const products = await listGlobalProducts()
    expect(products).toHaveLength(1)
    expect(products[0]?.id).toBe('fam-baggy')
    expect(products[0]?.slug).toBe('baggy')
    expect(products[0]?.fromPrice).toBe('2400')
    expect('variants' in products[0]!).toBe(false)
  })

  it('returns family detail with actual variant prices and stock', async () => {
    mockPrisma.productFamily.findFirst.mockResolvedValue(family())
    const { getGlobalProduct } = await import('../src/modules/global-store/service.js')
    const product = await getGlobalProduct('baggy')
    const vertM = product.variants.find((v) => v.id === 'sku-vert-m')
    expect(vertM?.sellPrice).toBe('2500')
    expect(vertM?.shops[0]?.quantity).toBe(20)
    expect(product.variants.find((v) => v.attributes.color === 'Blanc' && v.attributes.size === 'L')).toBeUndefined()
  })

  it('404s unpublished families on direct access', async () => {
    mockPrisma.productFamily.findFirst.mockResolvedValue(family({ availableOnline: false }))
    mockPrisma.product.findUnique.mockResolvedValue(null)
    const { getGlobalProduct } = await import('../src/modules/global-store/service.js')
    await expect(getGlobalProduct('baggy')).rejects.toMatchObject({ type: 'PRODUCT_NOT_FOUND', statusCode: 404 })
  })
})

import { describe, expect, it } from 'vitest'
import { orderLinePresenter, orderPresenter } from '../src/modules/storefront/presenter.js'

function line(overrides?: Record<string, unknown>) {
  return {
    id: 'line-1',
    productId: 'prod-1',
    quantity: 2,
    unitPrice: '2500',
    lineTotal: '5000',
    product: {
      name: 'Baggy M Vert',
      familyId: 'fam-1',
      variantLabel: 'M Vert',
      attributes: { size: 'M', color: 'Vert' },
      galatkProductRef: 'GTK-12',
      family: {
        id: 'fam-1',
        name: 'Baggy',
        images: [{ url: '/uploads/baggy.jpg', sortOrder: 0 }],
      },
    },
    ...overrides,
  }
}

describe('orderLinePresenter', () => {
  it('exposes product identity, variant, image, and money as strings', () => {
    const presented = orderLinePresenter(line() as never)

    expect(presented.productName).toBe('Baggy')
    expect(presented.variantLabel).toContain('M')
    expect(presented.attributes).toMatchObject({ size: 'M', color: 'Vert' })
    expect(presented.imageUrl).toBe('/uploads/baggy.jpg')
    expect(presented.sku).toBe('GTK-12')
    expect(presented.quantity).toBe(2)
    expect(presented.unitPrice).toBe('2500')
    expect(presented.lineTotal).toBe('5000')
  })

  it('returns a null image when the family has no photos', () => {
    const presented = orderLinePresenter(
      line({
        product: {
          name: 'Chemise Unique',
          familyId: null,
          variantLabel: 'Unique',
          attributes: {},
          galatkProductRef: null,
          family: null,
        },
      }) as never,
    )

    expect(presented.imageUrl).toBeNull()
    expect(presented.sku).toBeNull()
  })
})

describe('orderPresenter', () => {
  it('keeps customer, totals, and line items on the admin payload', () => {
    const presented = orderPresenter({
      id: 'ord-1',
      shopId: 'shop-1',
      orderNumber: 'CMD-1001',
      status: 'PLACED',
      fulfillmentType: 'DELIVERY',
      customerName: 'Amine B.',
      customerPhone: '0550000000',
      customerWilaya: 'Alger',
      customerEmail: null,
      deliveryAddress: 'Rue 1',
      deliveryCity: 'Alger',
      paymentMethod: 'CASH_ON_DELIVERY',
      subtotal: '5000',
      deliveryFee: '400',
      total: '5400',
      createdAt: new Date('2026-09-16T10:00:00.000Z'),
      client: null,
      lines: [line()],
    } as never)

    expect(presented.orderNumber).toBe('CMD-1001')
    expect(presented.lines).toHaveLength(1)
    expect(presented.total).toBe('5400')
    expect(presented.deliveryFee).toBe('400')
  })
})

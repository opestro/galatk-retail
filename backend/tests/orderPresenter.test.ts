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
      deliveryService: 'HOME',
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
    expect(presented.deliveryService).toBe('HOME')
    expect(presented.paymentStatus).toBe('UNPAID')
    expect(presented.remainingCredit).toBe('5400.00')
    expect(presented.collected).toBe('0.00')
  })

  it('exposes partial payment and remaining credit from the fulfillment sale', () => {
    const presented = orderPresenter({
      id: 'ord-2',
      shopId: 'shop-1',
      orderNumber: 'CMD-1002',
      status: 'COMPLETED',
      fulfillmentType: 'PICKUP',
      deliveryService: null,
      customerName: 'Amine B.',
      customerPhone: '0550000000',
      customerWilaya: 'Alger',
      customerEmail: null,
      deliveryAddress: null,
      deliveryCity: null,
      paymentMethod: 'CASH_ON_DELIVERY',
      subtotal: '5000',
      deliveryFee: '0',
      total: '5000',
      createdAt: new Date('2026-09-16T10:00:00.000Z'),
      client: { id: 'c1', name: 'Amine B.', phone: '0550000000', balance: '3000', creditLimit: '10000' },
      fulfillmentSale: {
        amountPaid: '2000',
        amountOnCredit: '3000',
        creditPortions: [{ remainingAmount: '3000' }],
      },
      lines: [line()],
    } as never)

    expect(presented.paymentStatus).toBe('PARTIAL')
    expect(presented.collected).toBe('2000.00')
    expect(presented.remainingCredit).toBe('3000.00')
    expect(presented.client?.balance).toBe('3000')
  })
})

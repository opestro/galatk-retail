import { describe, it, expect, vi, beforeEach } from 'vitest'

process.env.JWT_SECRET = 'test-customer-account-secret'

const mockPrisma = {
  customer: {
    findFirst: vi.fn(),
    findUnique: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
  },
  onlineOrder: {
    findMany: vi.fn(),
    findFirst: vi.fn(),
  },
  client: {
    findMany: vi.fn(),
  },
  sale: {
    findMany: vi.fn(),
    findFirst: vi.fn(),
  },
}

vi.mock('../src/resources/database/initDatabase.js', () => ({
  default: mockPrisma,
}))

vi.mock('../src/shared/auth/password.js', () => ({
  verifyPassword: vi.fn(async (plain: string, hash: string) => hash === `hashed:${plain}`),
  hashPassword: vi.fn(async (plain: string) => `hashed:${plain}`),
}))

describe('customer account login', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('issues a customer session for a valid email and password', async () => {
    mockPrisma.customer.findUnique.mockResolvedValue({
      id: 'cust-1',
      name: 'Ahmed',
      phone: '0551234567',
      email: 'ahmed@example.com',
      passwordHash: 'hashed:secret1',
    })

    const { login } = await import('../src/modules/account/service.js')
    const result = await login({ email: 'ahmed@example.com', password: 'secret1' })

    expect(result.customer).toEqual({
      id: 'cust-1',
      name: 'Ahmed',
      phone: '0551234567',
      email: 'ahmed@example.com',
    })
    expect(result.token).toBeTruthy()
  })

  it('rejects unknown or password-less customers with the same error', async () => {
    mockPrisma.customer.findUnique.mockResolvedValue({
      id: 'cust-1',
      name: 'Ahmed',
      phone: '0551234567',
      email: 'ahmed@example.com',
      passwordHash: null,
    })

    const { login } = await import('../src/modules/account/service.js')
    await expect(login({ email: 'ahmed@example.com', password: 'secret1' })).rejects.toMatchObject({
      type: 'INVALID_CREDENTIALS',
    })
  })
})

describe('customer account register', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('creates a new account and issues a session', async () => {
    mockPrisma.customer.findUnique.mockResolvedValue(null)
    mockPrisma.customer.findFirst.mockResolvedValue(null)
    mockPrisma.customer.create.mockResolvedValue({
      id: 'cust-2',
      name: 'Sara',
      phone: '0661234567',
      email: 'sara@example.com',
      passwordHash: 'hashed:secret1',
    })

    const { register } = await import('../src/modules/account/service.js')
    const result = await register({
      name: 'Sara',
      email: 'sara@example.com',
      phone: '0661234567',
      password: 'secret1',
    })

    expect(mockPrisma.customer.create).toHaveBeenCalledOnce()
    expect(result.customer.email).toBe('sara@example.com')
    expect(result.token).toBeTruthy()
  })

  it('rejects an email that already has an account', async () => {
    mockPrisma.customer.findUnique.mockResolvedValue({
      id: 'cust-1',
      name: 'Ahmed',
      phone: '0551234567',
      email: 'ahmed@example.com',
      passwordHash: 'hashed:secret1',
    })

    const { register } = await import('../src/modules/account/service.js')
    await expect(
      register({
        name: 'Ahmed',
        email: 'ahmed@example.com',
        phone: '0551234567',
        password: 'secret1',
      }),
    ).rejects.toMatchObject({ type: 'ACCOUNT_EXISTS' })
  })
})

describe('customer account orders', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('lists only orders linked to the signed-in customer', async () => {
    mockPrisma.onlineOrder.findMany.mockResolvedValue([])
    const { listOrders } = await import('../src/modules/account/service.js')
    await listOrders('cust-1')
    expect(mockPrisma.onlineOrder.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { client: { customerId: 'cust-1' } },
      }),
    )
  })

  it('does not return another customer’s order', async () => {
    mockPrisma.onlineOrder.findFirst.mockResolvedValue(null)
    const { getOrder } = await import('../src/modules/account/service.js')
    await expect(getOrder('cust-1', 'ord-other')).rejects.toMatchObject({ type: 'ORDER_NOT_FOUND' })
    expect(mockPrisma.onlineOrder.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'ord-other', client: { customerId: 'cust-1' } },
      }),
    )
  })
})

describe('customerOrderPresenter', () => {
  it('exposes shop name and hides staff credit fields', async () => {
    const { customerOrderPresenter } = await import('../src/modules/account/presenter.js')
    const presented = customerOrderPresenter({
      id: 'ord-1',
      shopId: 'shop-1',
      orderNumber: 'ORD-00001',
      status: 'PLACED',
      fulfillmentType: 'PICKUP',
      deliveryService: null,
      paymentMethod: 'PAY_ON_PICKUP',
      customerName: 'Ahmed',
      customerPhone: '0551234567',
      customerWilaya: 'Blida',
      subtotal: '1000',
      deliveryFee: '0',
      total: '1000',
      createdAt: new Date('2026-09-25T10:00:00.000Z'),
      shop: { id: 'shop-1', name: 'Centre', slug: 'centre' },
      lines: [
        {
          id: 'line-1',
          productId: 'prod-1',
          quantity: 1,
          unitPrice: '1000',
          lineTotal: '1000',
          product: {
            name: 'Baggy',
            familyId: 'fam-1',
            variantLabel: 'M',
            attributes: { size: 'M' },
            galatkProductRef: null,
            family: { id: 'fam-1', name: 'Baggy', images: [] },
          },
        },
      ],
    } as never)

    expect(presented.shop.name).toBe('Centre')
    expect(presented).not.toHaveProperty('client')
    expect(presented).not.toHaveProperty('creditApprovedById')
    expect(presented.remainingCredit).toBe('1000')
    expect(presented.lines[0]?.productName).toBe('Baggy')
  })

  it('exposes remaining unpaid credit from the fulfillment sale', async () => {
    const { customerOrderPresenter } = await import('../src/modules/account/presenter.js')
    const presented = customerOrderPresenter({
      id: 'ord-1',
      shopId: 'shop-1',
      orderNumber: 'ORD-00001',
      status: 'COMPLETED',
      fulfillmentType: 'PICKUP',
      deliveryService: null,
      paymentMethod: 'PAY_ON_PICKUP',
      customerName: 'Ahmed',
      customerPhone: '0551234567',
      customerWilaya: 'Blida',
      subtotal: '2000',
      deliveryFee: '0',
      total: '2000',
      createdAt: new Date('2026-09-25T10:00:00.000Z'),
      shop: { id: 'shop-1', name: 'Centre', slug: 'centre' },
      fulfillmentSale: {
        amountPaid: '500',
        amountOnCredit: '1500',
        creditPortions: [{ remainingAmount: '800' }, { remainingAmount: '200' }],
      },
      lines: [],
    } as never)

    expect(presented.amountPaid).toBe('500')
    expect(presented.amountOnCredit).toBe('1500')
    expect(presented.remainingCredit).toBe('1000')
  })

  it('treats cancelled orders as fully settled', async () => {
    const { customerOrderPresenter } = await import('../src/modules/account/presenter.js')
    const presented = customerOrderPresenter({
      id: 'ord-2',
      shopId: 'shop-1',
      orderNumber: 'ORD-00002',
      status: 'CANCELLED',
      fulfillmentType: 'PICKUP',
      deliveryService: null,
      paymentMethod: 'PAY_ON_PICKUP',
      customerName: 'Ahmed',
      customerPhone: '0551234567',
      customerWilaya: 'Blida',
      subtotal: '1000',
      deliveryFee: '0',
      total: '1000',
      createdAt: new Date('2026-09-25T10:00:00.000Z'),
      shop: { id: 'shop-1', name: 'Centre', slug: 'centre' },
      lines: [],
    } as never)

    expect(presented.remainingCredit).toBe('0')
  })
})

describe('customerCreditPresenter', () => {
  it('sums shop balances and lists unpaid portions', async () => {
    const { customerCreditPresenter } = await import('../src/modules/account/presenter.js')
    const presented = customerCreditPresenter([
      {
        id: 'client-1',
        shopId: 'shop-1',
        balance: '1500',
        shop: { id: 'shop-1', name: 'Centre', slug: 'centre' },
        creditPortions: [
          {
            id: 'p-1',
            originalAmount: '2000',
            remainingAmount: '1500',
            createdAt: new Date('2026-09-20T10:00:00.000Z'),
            sale: {
              id: 'sale-1',
              status: 'COMPLETED',
              onlineOrder: { id: 'ord-1', orderNumber: 'ORD-00001' },
            },
          },
        ],
      },
      {
        id: 'client-2',
        shopId: 'shop-2',
        balance: '0',
        shop: { id: 'shop-2', name: 'Hydra', slug: 'hydra' },
        creditPortions: [],
      },
    ])

    expect(presented.totalOutstanding).toBe('1500')
    expect(presented.shops).toHaveLength(1)
    expect(presented.portions[0]?.orderNumber).toBe('ORD-00001')
    expect(presented.portions[0]?.remainingAmount).toBe('1500')
  })

  it('includes open online orders that have not been paid yet', async () => {
    const { customerCreditPresenter } = await import('../src/modules/account/presenter.js')
    const presented = customerCreditPresenter(
      [
        {
          id: 'client-1',
          shopId: 'shop-1',
          balance: '0',
          shop: { id: 'shop-1', name: 'Centre', slug: 'centre' },
          creditPortions: [],
        },
      ],
      [
        {
          id: 'ord-7',
          orderNumber: 'ORD-00007',
          total: '2400',
          createdAt: new Date('2026-10-02T16:55:56.000Z'),
          shop: { id: 'shop-1', name: 'Centre', slug: 'centre' },
        },
      ],
    )

    expect(presented.totalOutstanding).toBe('2400')
    expect(presented.shops[0]?.balance).toBe('2400')
    expect(presented.portions[0]?.orderNumber).toBe('ORD-00007')
    expect(presented.portions[0]?.remainingAmount).toBe('2400')
  })
})

describe('customer account credit and in-store sales', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('loads credit only for the signed-in customer', async () => {
    mockPrisma.client.findMany.mockResolvedValue([])
    mockPrisma.onlineOrder.findMany.mockResolvedValue([])
    const { getCredit } = await import('../src/modules/account/service.js')
    await getCredit('cust-1')
    expect(mockPrisma.client.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { customerId: 'cust-1' },
      }),
    )
    expect(mockPrisma.onlineOrder.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          client: { customerId: 'cust-1' },
        }),
      }),
    )
  })

  it('lists in-store sales that are not already online orders', async () => {
    mockPrisma.sale.findMany.mockResolvedValue([])
    const { listSales } = await import('../src/modules/account/service.js')
    await listSales('cust-1')
    expect(mockPrisma.sale.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { client: { customerId: 'cust-1' }, onlineOrderId: null },
      }),
    )
  })

  it('does not return another customer’s in-store sale', async () => {
    mockPrisma.sale.findFirst.mockResolvedValue(null)
    const { getSale } = await import('../src/modules/account/service.js')
    await expect(getSale('cust-1', 'sale-other')).rejects.toMatchObject({ type: 'SALE_NOT_FOUND' })
  })
})

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
    expect(presented.lines[0]?.productName).toBe('Baggy')
  })
})

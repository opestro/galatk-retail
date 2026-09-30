import { describe, it, expect, vi, beforeEach } from 'vitest'

const mockPrisma = {
  customer: {
    findFirst: vi.fn(),
    findUnique: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    findUniqueOrThrow: vi.fn(),
  },
  client: {
    findUnique: vi.fn(),
    create: vi.fn(),
    findUniqueOrThrow: vi.fn(),
  },
  onlineOrder: {
    findFirst: vi.fn(),
  },
}

vi.mock('../src/resources/database/initDatabase.js', () => ({
  default: mockPrisma,
}))

describe('findOrCreateClientFromOnlineOrder', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('requires a signed-in customer to place an order', async () => {
    const { findOrCreateClientFromOnlineOrder } = await import('../src/shared/clients/upsertFromOnline.js')

    await expect(
      findOrCreateClientFromOnlineOrder('shop-1', {
        name: 'Ahmed',
        phone: '0551234567',
      }),
    ).rejects.toMatchObject({ type: 'UNAUTHORIZED' })
  })

  it('reuses an existing Customer, creates a new per-shop Client', async () => {
    const { findOrCreateClientFromOnlineOrder } = await import('../src/shared/clients/upsertFromOnline.js')

    mockPrisma.customer.findUnique.mockResolvedValue({
      id: 'cust-1',
      phone: '0551234567',
      name: 'Ahmed',
    })
    mockPrisma.client.findUnique.mockResolvedValue(null)
    mockPrisma.client.create.mockResolvedValue({ id: 'cli-2', shopId: 'shop-2', customerId: 'cust-1' })

    const client = await findOrCreateClientFromOnlineOrder('shop-2', {
      name: 'Ahmed',
      phone: '0551234567',
      authenticatedCustomerId: 'cust-1',
    })

    expect(client.id).toBe('cli-2')
    expect(client.customerId).toBe('cust-1')
    expect(mockPrisma.customer.create).not.toHaveBeenCalled()
    expect(mockPrisma.client.create).toHaveBeenCalledOnce()
  })

  it('reuses an existing Client record if the customer already bought from this shop', async () => {
    const { findOrCreateClientFromOnlineOrder } = await import('../src/shared/clients/upsertFromOnline.js')

    mockPrisma.customer.findUnique.mockResolvedValue({
      id: 'cust-1',
      phone: '0551234567',
      name: 'Ahmed',
    })
    mockPrisma.client.findUnique.mockResolvedValue({ id: 'cli-1', shopId: 'shop-1', customerId: 'cust-1' })

    const client = await findOrCreateClientFromOnlineOrder('shop-1', {
      name: 'Ahmed',
      phone: '0551234567',
      authenticatedCustomerId: 'cust-1',
    })

    expect(client.id).toBe('cli-1')
    expect(mockPrisma.customer.create).not.toHaveBeenCalled()
    expect(mockPrisma.client.create).not.toHaveBeenCalled()
  })
})

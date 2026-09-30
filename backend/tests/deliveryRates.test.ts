import { describe, it, expect, vi, beforeEach } from 'vitest'
import { CustomError } from '../src/shared/types/error_type.js'
import { ALGERIA_WILAYAS } from '../src/shared/geo/algeriaWilayas.js'

const mockPrisma = {
  wilayaDeliveryRate: {
    findMany: vi.fn(),
    upsert: vi.fn(),
  },
  $transaction: vi.fn(),
}

vi.mock('../src/resources/database/initDatabase.js', () => ({
  default: mockPrisma,
}))

vi.mock('../src/resources/storage/productImages.js', () => ({
  BANNER_RELATIVE_DIR: 'banners',
  deleteStoredImage: vi.fn(),
  persistImageBuffer: vi.fn(),
}))

vi.mock('../src/modules/settings/bannerValidation.js', () => ({
  assertBannerImageFile: vi.fn(),
}))

describe('wilaya delivery rates', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockPrisma.wilayaDeliveryRate.findMany.mockResolvedValue([
      { wilaya: 'Alger', stopdeskFee: { toString: () => '0' }, homeFee: { toString: () => '400' } },
    ])
    mockPrisma.$transaction.mockResolvedValue([])
  })

  it('returns all 58 wilayas and treats a 0 fee as free', async () => {
    const { listDeliveryRates } = await import('../src/modules/settings/service.js')
    const rates = await listDeliveryRates()

    expect(rates).toHaveLength(ALGERIA_WILAYAS.length)
    const alger = rates.find((row) => row.wilaya === 'Alger')
    expect(alger).toMatchObject({
      stopdeskFee: '0',
      homeFee: '400',
      stopdeskFree: true,
      homeFree: false,
    })
    const blida = rates.find((row) => row.wilaya === 'Blida')
    expect(blida).toMatchObject({
      stopdeskFee: '0',
      homeFee: '0',
      stopdeskFree: true,
      homeFree: true,
    })
  })

  it('rejects an unknown wilaya on save', async () => {
    const { updateDeliveryRates } = await import('../src/modules/settings/service.js')

    await expect(
      updateDeliveryRates({
        rates: [{ wilaya: 'Narnia', stopdeskFee: 100, homeFee: 200 }],
      }),
    ).rejects.toBeInstanceOf(CustomError)
  })

  it('upserts stop-desk and home amounts independently', async () => {
    const { updateDeliveryRates } = await import('../src/modules/settings/service.js')
    await updateDeliveryRates({
      rates: [
        { wilaya: 'Blida', stopdeskFee: 0, homeFee: 650 },
        { wilaya: 'Oran', stopdeskFee: 350, homeFee: 350 },
      ],
    })

    expect(mockPrisma.$transaction).toHaveBeenCalled()
    const ops = mockPrisma.$transaction.mock.calls[0][0]
    expect(ops).toHaveLength(2)
    expect(mockPrisma.wilayaDeliveryRate.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { wilaya: 'Blida' },
        create: expect.objectContaining({ wilaya: 'Blida' }),
      }),
    )
  })
})

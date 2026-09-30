import { describe, it, expect, vi, beforeEach } from 'vitest'
import { CustomError } from '../src/shared/types/error_type.js'
import { BANNER_RELATIVE_DIR } from '../src/resources/storage/productImages.js'
import {
  BANNER_IMAGE_MAX,
  BANNER_TITLE_MAX,
  DEFAULT_BANNER_INTERVAL_MS,
  DEFAULT_BANNER_SUBTITLE,
  DEFAULT_BANNER_TITLE,
  SITE_SETTINGS_ID,
} from '../src/modules/settings/constants.js'
import { siteSettingsPresenter } from '../src/modules/settings/presenter.js'

const mockPrisma = {
  siteSettings: {
    findUnique: vi.fn(),
    findUniqueOrThrow: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
  },
  siteBannerImage: {
    create: vi.fn(),
    findFirst: vi.fn(),
    delete: vi.fn(),
  },
}

vi.mock('../src/resources/database/initDatabase.js', () => ({
  default: mockPrisma,
}))

const persistImageBuffer = vi.fn()
const deleteStoredImage = vi.fn()

vi.mock('../src/resources/storage/productImages.js', async () => {
  const actual = await vi.importActual<typeof import('../src/resources/storage/productImages.js')>(
    '../src/resources/storage/productImages.js',
  )
  return {
    ...actual,
    persistImageBuffer: (...args: unknown[]) => persistImageBuffer(...args),
    deleteStoredImage: (...args: unknown[]) => deleteStoredImage(...args),
  }
})

const assertBannerImageFile = vi.fn()
vi.mock('../src/modules/settings/bannerValidation.js', () => ({
  assertBannerImageFile: (...args: unknown[]) => assertBannerImageFile(...args),
}))

const now = new Date('2026-09-25T12:00:00.000Z')

function row(overrides: Record<string, unknown> = {}) {
  return {
    id: SITE_SETTINGS_ID,
    bannerEnabled: true,
    bannerTitle: DEFAULT_BANNER_TITLE,
    bannerSubtitle: DEFAULT_BANNER_SUBTITLE,
    bannerIntervalMs: DEFAULT_BANNER_INTERVAL_MS,
    createdAt: now,
    updatedAt: now,
    images: [] as Array<Record<string, unknown>>,
    ...overrides,
  }
}

describe('site settings banner', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockPrisma.siteSettings.findUnique.mockResolvedValue(null)
    mockPrisma.siteSettings.create.mockResolvedValue(row())
    mockPrisma.siteSettings.findUniqueOrThrow.mockResolvedValue(row())
    mockPrisma.siteSettings.update.mockResolvedValue(row())
  })

  it('creates default copy when no settings row exists', async () => {
    const { getOrCreateSiteSettings } = await import('../src/modules/settings/service.js')
    await getOrCreateSiteSettings()

    expect(mockPrisma.siteSettings.create).toHaveBeenCalledWith({
      data: {
        id: SITE_SETTINGS_ID,
        bannerEnabled: true,
        bannerTitle: DEFAULT_BANNER_TITLE,
        bannerSubtitle: DEFAULT_BANNER_SUBTITLE,
        bannerIntervalMs: DEFAULT_BANNER_INTERVAL_MS,
      },
    })
  })

  it('returns the existing row without inserting again', async () => {
    mockPrisma.siteSettings.findUnique.mockResolvedValue(row({ bannerTitle: 'Summer sale' }))
    const { getOrCreateSiteSettings } = await import('../src/modules/settings/service.js')
    const result = await getOrCreateSiteSettings()

    expect(mockPrisma.siteSettings.create).not.toHaveBeenCalled()
    expect(result.bannerTitle).toBe('Summer sale')
  })

  it('trims title and subtitle on update', async () => {
    mockPrisma.siteSettings.findUnique.mockResolvedValue(row())
    const { updateSiteSettings } = await import('../src/modules/settings/service.js')
    await updateSiteSettings({
      bannerTitle: '  New season  ',
      bannerSubtitle: '  Fresh drops  ',
      bannerEnabled: false,
      bannerIntervalMs: 8000,
    })

    expect(mockPrisma.siteSettings.update).toHaveBeenCalledWith({
      where: { id: SITE_SETTINGS_ID },
      data: {
        bannerEnabled: false,
        bannerTitle: 'New season',
        bannerSubtitle: 'Fresh drops',
        bannerIntervalMs: 8000,
      },
    })
  })

  it('rejects an empty title', async () => {
    mockPrisma.siteSettings.findUnique.mockResolvedValue(row())
    const { updateSiteSettings } = await import('../src/modules/settings/service.js')
    await expect(updateSiteSettings({ bannerTitle: '   ' })).rejects.toMatchObject({
      type: 'VALIDATION_ERROR',
    } satisfies Partial<CustomError>)
  })

  it('rejects a title that exceeds the character limit', async () => {
    mockPrisma.siteSettings.findUnique.mockResolvedValue(row())
    const { updateSiteSettings } = await import('../src/modules/settings/service.js')
    await expect(updateSiteSettings({ bannerTitle: 'x'.repeat(BANNER_TITLE_MAX + 1) })).rejects.toBeInstanceOf(
      CustomError,
    )
  })

  it('rejects an interval outside the allowed range', async () => {
    mockPrisma.siteSettings.findUnique.mockResolvedValue(row())
    const { updateSiteSettings } = await import('../src/modules/settings/service.js')
    await expect(updateSiteSettings({ bannerIntervalMs: 500 })).rejects.toBeInstanceOf(CustomError)
  })

  it('appends a banner image without deleting existing slides', async () => {
    mockPrisma.siteSettings.findUnique.mockResolvedValue(
      row({
        images: [{ id: 'img-1', sortOrder: 0, filename: 'old.jpg', url: '/uploads/banners/old.jpg' }],
      }),
    )
    persistImageBuffer.mockReturnValue({ filename: 'new.webp', url: '/uploads/banners/new.webp' })
    mockPrisma.siteSettings.findUniqueOrThrow.mockResolvedValue(
      row({
        images: [
          { id: 'img-1', sortOrder: 0, filename: 'old.jpg', url: '/uploads/banners/old.jpg' },
          { id: 'img-2', sortOrder: 1, filename: 'new.webp', url: '/uploads/banners/new.webp' },
        ],
      }),
    )

    const { addBannerImage } = await import('../src/modules/settings/service.js')
    const file = { buffer: Buffer.from('img'), mimetype: 'image/webp', size: 12 }
    await addBannerImage(file)

    expect(assertBannerImageFile).toHaveBeenCalledWith(file)
    expect(persistImageBuffer).toHaveBeenCalledWith(file.buffer, 'image/webp', BANNER_RELATIVE_DIR)
    expect(mockPrisma.siteBannerImage.create).toHaveBeenCalledWith({
      data: {
        settingsId: SITE_SETTINGS_ID,
        filename: 'new.webp',
        url: '/uploads/banners/new.webp',
        mimeType: 'image/webp',
        sortOrder: 1,
      },
    })
    expect(deleteStoredImage).not.toHaveBeenCalled()
  })

  it('rejects a 11th banner image', async () => {
    mockPrisma.siteSettings.findUnique.mockResolvedValue(
      row({
        images: Array.from({ length: BANNER_IMAGE_MAX }, (_, i) => ({ id: `img-${i}`, sortOrder: i })),
      }),
    )
    const { addBannerImage } = await import('../src/modules/settings/service.js')
    await expect(
      addBannerImage({ buffer: Buffer.from('img'), mimetype: 'image/jpeg', size: 4 }),
    ).rejects.toMatchObject({ type: 'VALIDATION_ERROR' } satisfies Partial<CustomError>)
  })

  it('deletes one stored banner file', async () => {
    mockPrisma.siteSettings.findUnique.mockResolvedValue(row())
    mockPrisma.siteBannerImage.findFirst.mockResolvedValue({
      id: 'img-1',
      filename: 'hero.png',
      settingsId: SITE_SETTINGS_ID,
    })
    const { removeBannerImage } = await import('../src/modules/settings/service.js')
    await removeBannerImage('img-1')

    expect(mockPrisma.siteBannerImage.delete).toHaveBeenCalledWith({ where: { id: 'img-1' } })
    expect(deleteStoredImage).toHaveBeenCalledWith('hero.png', BANNER_RELATIVE_DIR)
  })

  it('omits filenames from the public presenter and sorts slides', () => {
    const presented = siteSettingsPresenter(
      row({
        images: [
          {
            id: 'img-b',
            filename: 'b.jpg',
            url: '/uploads/banners/b.jpg',
            mimeType: 'image/jpeg',
            sortOrder: 1,
            createdAt: now,
            settingsId: SITE_SETTINGS_ID,
          },
          {
            id: 'img-a',
            filename: 'a.jpg',
            url: '/uploads/banners/a.jpg',
            mimeType: 'image/jpeg',
            sortOrder: 0,
            createdAt: now,
            settingsId: SITE_SETTINGS_ID,
          },
        ],
      }) as never,
    )
    expect(presented.images).toEqual([
      { id: 'img-a', url: '/uploads/banners/a.jpg', sortOrder: 0 },
      { id: 'img-b', url: '/uploads/banners/b.jpg', sortOrder: 1 },
    ])
    expect(presented.bannerIntervalMs).toBe(DEFAULT_BANNER_INTERVAL_MS)
    expect(JSON.stringify(presented)).not.toContain('filename')
  })
})

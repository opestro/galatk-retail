import prisma from '../../resources/database/initDatabase.js'
import {
  BANNER_RELATIVE_DIR,
  deleteStoredImage,
  persistImageBuffer,
} from '../../resources/storage/productImages.js'
import { CustomError } from '../../shared/types/error_type.js'
import { assertBannerImageFile } from './bannerValidation.js'
import {
  BANNER_IMAGE_MAX,
  BANNER_INTERVAL_MAX_MS,
  BANNER_INTERVAL_MIN_MS,
  BANNER_SUBTITLE_MAX,
  BANNER_TITLE_MAX,
  DEFAULT_BANNER_INTERVAL_MS,
  DEFAULT_BANNER_SUBTITLE,
  DEFAULT_BANNER_TITLE,
  SITE_SETTINGS_ID,
} from './constants.js'
import { SiteSettingsWithImages } from './presenter.js'
import { UpdateSiteSettingsInput } from './types.js'

const settingsInclude = {
  images: { orderBy: { sortOrder: 'asc' as const } },
}

function clipText(value: string, max: number, field: string): string {
  const trimmed = value.trim()
  if (trimmed.length > max) {
    throw new CustomError('VALIDATION_ERROR', `${field} must be ${max} characters or fewer`, 400)
  }
  return trimmed
}

function parseIntervalMs(value: number): number {
  if (!Number.isFinite(value)) {
    throw new CustomError('VALIDATION_ERROR', 'bannerIntervalMs must be a number', 400)
  }
  const rounded = Math.round(value)
  if (rounded < BANNER_INTERVAL_MIN_MS || rounded > BANNER_INTERVAL_MAX_MS) {
    throw new CustomError(
      'VALIDATION_ERROR',
      `bannerIntervalMs must be between ${BANNER_INTERVAL_MIN_MS} and ${BANNER_INTERVAL_MAX_MS}`,
      400,
    )
  }
  return rounded
}

async function loadSettings(): Promise<SiteSettingsWithImages> {
  return prisma.siteSettings.findUniqueOrThrow({
    where: { id: SITE_SETTINGS_ID },
    include: settingsInclude,
  })
}

/**
 * Ensures the singleton settings row exists so the storefront never 404s
 * before an admin saves settings.
 */
export async function getOrCreateSiteSettings(): Promise<SiteSettingsWithImages> {
  const existing = await prisma.siteSettings.findUnique({
    where: { id: SITE_SETTINGS_ID },
    include: settingsInclude,
  })
  if (existing) return existing

  await prisma.siteSettings.create({
    data: {
      id: SITE_SETTINGS_ID,
      bannerEnabled: true,
      bannerTitle: DEFAULT_BANNER_TITLE,
      bannerSubtitle: DEFAULT_BANNER_SUBTITLE,
      bannerIntervalMs: DEFAULT_BANNER_INTERVAL_MS,
    },
  })

  return loadSettings()
}

export async function updateSiteSettings(input: UpdateSiteSettingsInput): Promise<SiteSettingsWithImages> {
  await getOrCreateSiteSettings()

  const data: {
    bannerEnabled?: boolean
    bannerTitle?: string
    bannerSubtitle?: string
    bannerIntervalMs?: number
  } = {}

  if (input.bannerEnabled !== undefined) {
    data.bannerEnabled = Boolean(input.bannerEnabled)
  }
  if (input.bannerTitle !== undefined) {
    const title = clipText(input.bannerTitle, BANNER_TITLE_MAX, 'bannerTitle')
    if (!title) {
      throw new CustomError('VALIDATION_ERROR', 'bannerTitle is required', 400)
    }
    data.bannerTitle = title
  }
  if (input.bannerSubtitle !== undefined) {
    data.bannerSubtitle = clipText(input.bannerSubtitle, BANNER_SUBTITLE_MAX, 'bannerSubtitle')
  }
  if (input.bannerIntervalMs !== undefined) {
    data.bannerIntervalMs = parseIntervalMs(Number(input.bannerIntervalMs))
  }

  await prisma.siteSettings.update({
    where: { id: SITE_SETTINGS_ID },
    data,
  })

  return loadSettings()
}

export async function addBannerImage(file: {
  buffer: Buffer
  mimetype: string
  size: number
}): Promise<SiteSettingsWithImages> {
  const current = await getOrCreateSiteSettings()
  if (current.images.length >= BANNER_IMAGE_MAX) {
    throw new CustomError('VALIDATION_ERROR', `You can add at most ${BANNER_IMAGE_MAX} banner images`, 400)
  }
  assertBannerImageFile(file)
  const stored = persistImageBuffer(file.buffer, file.mimetype, BANNER_RELATIVE_DIR)
  const lastOrder = current.images.at(-1)?.sortOrder ?? -1

  await prisma.siteBannerImage.create({
    data: {
      settingsId: SITE_SETTINGS_ID,
      filename: stored.filename,
      url: stored.url,
      mimeType: file.mimetype,
      sortOrder: lastOrder + 1,
    },
  })

  return loadSettings()
}

export async function removeBannerImage(imageId: string): Promise<SiteSettingsWithImages> {
  await getOrCreateSiteSettings()
  const image = await prisma.siteBannerImage.findFirst({
    where: { id: imageId, settingsId: SITE_SETTINGS_ID },
  })
  if (!image) {
    throw new CustomError('NOT_FOUND', 'Banner image not found', 404)
  }

  await prisma.siteBannerImage.delete({ where: { id: image.id } })
  deleteStoredImage(image.filename, BANNER_RELATIVE_DIR)
  return loadSettings()
}

import { SiteBannerImage, SiteSettings } from '@prisma/client'
import { SiteSettingsResponse } from './types.js'

export type SiteSettingsWithImages = SiteSettings & { images: SiteBannerImage[] }

/** Public + admin payload for the homepage hero. Filenames stay server-side. */
export function siteSettingsPresenter(row: SiteSettingsWithImages): SiteSettingsResponse {
  const images = [...row.images]
    .sort((a, b) => a.sortOrder - b.sortOrder)
    .map((image) => ({
      id: image.id,
      url: image.url,
      sortOrder: image.sortOrder,
    }))

  return {
    bannerEnabled: row.bannerEnabled,
    bannerTitle: row.bannerTitle,
    bannerSubtitle: row.bannerSubtitle,
    bannerIntervalMs: row.bannerIntervalMs,
    images,
    updatedAt: row.updatedAt,
  }
}

import { SiteBannerImage, SiteSettings } from '@prisma/client'
import { SiteSettingsResponse, WilayaDeliveryRateResponse } from './types.js'

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

function money(value: { toString(): string }): string {
  return value.toString()
}

/**
 * Always returns all 58 official wilayas. Missing DB rows are 0 (free)
 * until an admin saves an amount.
 */
export function deliveryRatesPresenter(
  rows: Array<{ wilaya: string; stopdeskFee: { toString(): string }; homeFee: { toString(): string } }>,
  wilayas: readonly string[],
): WilayaDeliveryRateResponse[] {
  const byWilaya = new Map(rows.map((row) => [row.wilaya, row]))
  return wilayas.map((wilaya) => {
    const row = byWilaya.get(wilaya)
    const stopdeskFee = row ? money(row.stopdeskFee) : '0'
    const homeFee = row ? money(row.homeFee) : '0'
    return {
      wilaya,
      stopdeskFee,
      homeFee,
      stopdeskFree: Number(stopdeskFee) === 0,
      homeFree: Number(homeFee) === 0,
    }
  })
}

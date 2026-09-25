export interface UpdateSiteSettingsInput {
  bannerEnabled?: boolean
  bannerTitle?: string
  bannerSubtitle?: string
  bannerIntervalMs?: number
}

export interface SiteBannerImageResponse {
  id: string
  url: string
  sortOrder: number
}

export interface SiteSettingsResponse {
  bannerEnabled: boolean
  bannerTitle: string
  bannerSubtitle: string
  bannerIntervalMs: number
  images: SiteBannerImageResponse[]
  updatedAt: Date
}

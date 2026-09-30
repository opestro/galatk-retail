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

export interface WilayaDeliveryRateInput {
  wilaya: string
  stopdeskFee: number
  homeFee: number
}

export interface WilayaDeliveryRateResponse {
  wilaya: string
  stopdeskFee: string
  homeFee: string
  /** True when the stop-desk charge is 0 (shown as free in admin). */
  stopdeskFree: boolean
  homeFree: boolean
}

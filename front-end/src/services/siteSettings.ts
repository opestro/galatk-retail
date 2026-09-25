import { api } from '@/services/api'
import type { SiteSettings } from '@/types/api'

export async function getPublicHomeBanner(): Promise<SiteSettings> {
  const { data } = await api.get<{ data: SiteSettings }>('/global-store/banner')
  return data.data
}

export async function getSiteSettings(): Promise<SiteSettings> {
  const { data } = await api.get<{ data: SiteSettings }>('/settings')
  return data.data
}

export async function updateSiteSettings(input: {
  bannerEnabled?: boolean
  bannerTitle?: string
  bannerSubtitle?: string
  bannerIntervalMs?: number
}): Promise<SiteSettings> {
  const { data } = await api.patch<{ data: SiteSettings }>('/settings', input)
  return data.data
}

export async function uploadHomeBannerImage(file: File): Promise<SiteSettings> {
  const form = new FormData()
  form.append('image', file)
  const { data } = await api.post<{ data: SiteSettings }>('/settings/banner-image', form)
  return data.data
}

export async function removeHomeBannerImage(imageId: string): Promise<SiteSettings> {
  const { data } = await api.delete<{ data: SiteSettings }>(
    `/settings/banner-image/${encodeURIComponent(imageId)}`,
  )
  return data.data
}

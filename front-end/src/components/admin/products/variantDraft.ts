import type { VariantPayload } from '@/services/products'

export interface VariantDraft {
  color: string
  size: string
  unitCost: number | string
  sellPrice: number | string
  quantity: number | string
  availableOnline: boolean
  isActive: boolean
}

/** Primary variant axes in Galatk Retail. Extra keys on `attributes` stay supported. */
export const PRIMARY_ATTRIBUTE_KEYS = ['color', 'size'] as const

export function emptyVariantDraft(): VariantDraft {
  return {
    color: '',
    size: '',
    unitCost: 0,
    sellPrice: 0,
    quantity: 0,
    availableOnline: true,
    isActive: true,
  }
}

export function attributesFromDraft(draft: VariantDraft): Record<string, string> {
  const attrs: Record<string, string> = {}
  if (draft.color.trim()) attrs.color = draft.color.trim()
  if (draft.size.trim()) attrs.size = draft.size.trim()
  return attrs
}

export function draftKey(draft: VariantDraft): string {
  const color = draft.color.trim().toLowerCase()
  const size = draft.size.trim().toLowerCase()
  return `${color}|${size}`
}

export function parseAmount(raw: number | string): number | null {
  const parsed = Number(raw)
  if (!Number.isFinite(parsed) || parsed < 0) return null
  return parsed
}

export function draftToPayload(draft: VariantDraft): VariantPayload | null {
  const attrs = attributesFromDraft(draft)
  if (!attrs.color && !attrs.size) return null
  const sellPrice = parseAmount(draft.sellPrice)
  const unitCost = parseAmount(draft.unitCost)
  const quantity = Number(draft.quantity)
  if (sellPrice === null || unitCost === null) return null
  if (!Number.isInteger(quantity) || quantity < 0) return null
  return {
    attributes: attrs,
    unitCost,
    sellPrice,
    quantity,
    availableOnline: draft.availableOnline,
    isActive: draft.isActive,
  }
}

export const PRODUCT_NAME_MAX = 120
export const PRODUCT_DESCRIPTION_MAX = 4000
export const IMAGE_MAX_BYTES = 5 * 1024 * 1024
export const IMAGE_ACCEPT = 'image/jpeg,image/png,image/webp,image/gif'
export const IMAGE_MIME = new Set(['image/jpeg', 'image/png', 'image/webp', 'image/gif'])

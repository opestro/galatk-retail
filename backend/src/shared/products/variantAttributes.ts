/**
 * Extensible variant options (size, color, and future keys like material).
 * Uniqueness is the canonical attributesKey, not a hardcoded (size, color) pair.
 */

export type VariantAttributes = Record<string, string>

export const DEFAULT_SIZES = ['XS', 'S', 'M', 'L', 'XL', 'XXL'] as const

export const DEFAULT_COLORS = [
  'Noir',
  'Blanc',
  'Vert',
  'Rouge',
  'Bleu',
  'Beige',
  'Gris',
  'Rose',
  'Marron',
] as const

const SIZE_TOKENS = new Set(
  [
    ...DEFAULT_SIZES,
    'XXXL',
    '2XL',
    '3XL',
    '4XL',
    'UNIQUE',
  ].map((token) => token.toLowerCase()),
)

export function normalizeToken(value: string): string {
  return value
    .normalize('NFD')
    .replace(/\p{M}/gu, '')
    .toLowerCase()
    .trim()
}

export function canonicalizeAttributes(attrs: VariantAttributes | null | undefined): VariantAttributes {
  const out: VariantAttributes = {}
  if (!attrs || typeof attrs !== 'object') {
    return out
  }

  for (const [rawKey, rawValue] of Object.entries(attrs)) {
    const key = rawKey.trim().toLowerCase()
    const value = String(rawValue ?? '').trim()
    if (!key || !value) continue
    out[key] = value
  }

  return out
}

/**
 * Stable uniqueness key: sorted `key:normalizedValue` pairs, or `default` when empty.
 */
export function attributesKey(attrs: VariantAttributes | null | undefined): string {
  const canonical = canonicalizeAttributes(attrs)
  const keys = Object.keys(canonical).sort()
  if (keys.length === 0) {
    return 'default'
  }

  return keys.map((key) => `${key}:${normalizeToken(canonical[key] ?? '')}`).join('|')
}

export function formatVariantLabel(attrs: VariantAttributes | null | undefined): string | null {
  const canonical = canonicalizeAttributes(attrs)
  const parts: string[] = []
  if (canonical.size) parts.push(canonical.size)
  if (canonical.color) parts.push(canonical.color)

  for (const key of Object.keys(canonical).sort()) {
    if (key === 'size' || key === 'color') continue
    parts.push(canonical[key] ?? '')
  }

  const label = parts.filter(Boolean).join(' ').trim()
  return label || null
}

export function displayVariantLabel(attrs: VariantAttributes | null | undefined, fallback?: string | null): string {
  const canonical = canonicalizeAttributes(attrs)
  const bits: string[] = []
  if (canonical.color) bits.push(canonical.color)
  if (canonical.size) bits.push(canonical.size)
  for (const key of Object.keys(canonical).sort()) {
    if (key === 'size' || key === 'color') continue
    bits.push(canonical[key] ?? '')
  }
  const formatted = bits.filter(Boolean).join(' / ')
  return formatted || fallback?.trim() || 'Standard'
}

/** Parse leftover Galatk labels such as "M blanc" or "Vert". */
export function parseAttributesFromLabel(label: string | null | undefined): VariantAttributes {
  const trimmed = label?.trim()
  if (!trimmed) {
    return {}
  }

  const words = trimmed.split(/\s+/).filter(Boolean)
  const first = words[0] ?? ''
  if (SIZE_TOKENS.has(first.toLowerCase())) {
    const color = words.slice(1).join(' ').trim()
    const attrs: VariantAttributes = { size: first.toUpperCase() === 'UNIQUE' ? 'Unique' : first.toUpperCase() }
    if (first.toLowerCase() === 'unique') {
      attrs.size = 'Unique'
    } else if (['xs', 's', 'm', 'l', 'xl', 'xxl', 'xxxl'].includes(first.toLowerCase())) {
      attrs.size = first.toUpperCase()
    } else {
      attrs.size = first.toUpperCase()
    }
    if (color) attrs.color = titleCaseWords(color)
    return attrs
  }

  const last = words[words.length - 1] ?? ''
  if (words.length > 1 && SIZE_TOKENS.has(last.toLowerCase())) {
    return {
      color: titleCaseWords(words.slice(0, -1).join(' ')),
      size: last.toUpperCase(),
    }
  }

  return { color: titleCaseWords(trimmed) }
}

export function skuName(familyName: string, attrs: VariantAttributes | null | undefined): string {
  const label = formatVariantLabel(attrs)
  return label ? `${familyName.trim()} ${label}` : familyName.trim()
}

export function titleCaseWords(value: string): string {
  return value
    .trim()
    .split(/\s+/)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ')
}

export function familySlugFromName(name: string): string {
  return normalizeToken(name).replace(/[^a-z0-9]+/g, ' ').trim()
}

export function attributesFromUnknown(value: unknown): VariantAttributes {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return {}
  }
  const raw = value as Record<string, unknown>
  const out: VariantAttributes = {}
  for (const [key, val] of Object.entries(raw)) {
    if (val === null || val === undefined) continue
    out[key] = String(val)
  }
  return canonicalizeAttributes(out)
}

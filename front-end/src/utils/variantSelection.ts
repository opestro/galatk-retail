/**
 * Resolves storefront option UI from actual variant rows.
 * Never invents size/color values — only attributes present on variants.
 */

export type AttributeMap = Record<string, string>

export interface SelectableVariant {
  id: string
  attributes: AttributeMap
}

const PREFERRED_KEYS = ['color', 'size'] as const

const SIZE_ORDER = ['XS', 'S', 'M', 'L', 'XL', 'XXL', 'XXXL', '2XL', '3XL', '4XL', 'UNIQUE']

export function normalizeOptionValue(value: string): string {
  return value
    .normalize('NFD')
    .replace(/\p{M}/gu, '')
    .toLowerCase()
    .trim()
}

export function displayOptionValue(key: string, value: string): string {
  const trimmed = value.trim()
  if (!trimmed) return trimmed
  if (key === 'size') {
    if (normalizeOptionValue(trimmed) === 'unique') return 'Unique'
    return trimmed.toUpperCase()
  }
  return trimmed
    .split(/\s+/)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(' ')
}

export function optionValuesEqual(a: string | undefined, b: string | undefined): boolean {
  return normalizeOptionValue(a ?? '') === normalizeOptionValue(b ?? '')
}

export function optionKeys(variants: SelectableVariant[]): string[] {
  const keys = new Set<string>()
  for (const variant of variants) {
    for (const [key, value] of Object.entries(variant.attributes ?? {})) {
      if (value?.trim()) keys.add(key)
    }
  }
  const preferred = PREFERRED_KEYS.filter((key) => keys.has(key))
  const rest = [...keys].filter((key) => !PREFERRED_KEYS.includes(key as (typeof PREFERRED_KEYS)[number])).sort()
  return [...preferred, ...rest]
}

export function optionValues(variants: SelectableVariant[], key: string): string[] {
  const seen = new Set<string>()
  const values: string[] = []
  for (const variant of variants) {
    const raw = variant.attributes[key]?.trim()
    if (!raw) continue
    const normalized = normalizeOptionValue(raw)
    if (seen.has(normalized)) continue
    seen.add(normalized)
    values.push(displayOptionValue(key, raw))
  }
  if (key === 'size') {
    return [...values].sort((a, b) => {
      const ai = SIZE_ORDER.indexOf(normalizeOptionValue(a).toUpperCase())
      const bi = SIZE_ORDER.indexOf(normalizeOptionValue(b).toUpperCase())
      const ao = ai === -1 ? SIZE_ORDER.length : ai
      const bo = bi === -1 ? SIZE_ORDER.length : bi
      if (ao !== bo) return ao - bo
      return a.localeCompare(b)
    })
  }
  return values
}

export function labelForOptionKey(key: string): string {
  if (key === 'color') return 'Color'
  if (key === 'size') return 'Size'
  return key.charAt(0).toUpperCase() + key.slice(1)
}

function matchesPrefix(
  variant: SelectableVariant,
  selection: AttributeMap,
  keys: string[],
): boolean {
  return keys.every((key) => {
    const selected = selection[key]
    if (!selected) return true
    return optionValuesEqual(variant.attributes[key], selected)
  })
}

/**
 * A value is available when at least one real variant has that value and
 * matches already-chosen options that appear before this key.
 */
export function isOptionValueAvailable(
  variants: SelectableVariant[],
  optionOrder: string[],
  selection: AttributeMap,
  key: string,
  value: string,
): boolean {
  const keyIndex = optionOrder.indexOf(key)
  const prefixKeys = optionOrder.slice(0, Math.max(0, keyIndex))
  return variants.some(
    (variant) =>
      optionValuesEqual(variant.attributes[key], value) && matchesPrefix(variant, selection, prefixKeys),
  )
}

export function findMatchingVariant(
  variants: SelectableVariant[],
  selection: AttributeMap,
  optionOrder: string[],
): SelectableVariant | undefined {
  if (optionOrder.length === 0) {
    return variants[0]
  }
  return variants.find((variant) =>
    optionOrder.every((key) => optionValuesEqual(variant.attributes[key], selection[key])),
  )
}

export function defaultSelection(
  variants: SelectableVariant[],
  optionOrder: string[],
  preferId?: string,
): AttributeMap {
  const preferred = preferId ? variants.find((variant) => variant.id === preferId) : undefined
  const source = preferred ?? variants[0]
  const selection: AttributeMap = {}
  if (!source) return selection
  for (const key of optionOrder) {
    const value = source.attributes[key]
    if (value) selection[key] = displayOptionValue(key, value)
  }
  return selection
}

/**
 * After changing `key`, later options are snapped to the first still-valid value
 * so the customer can never hold an invented combination (e.g. Blanc + L).
 */
export function applyOptionChange(
  variants: SelectableVariant[],
  optionOrder: string[],
  current: AttributeMap,
  key: string,
  value: string,
): AttributeMap {
  const next: AttributeMap = { ...current, [key]: value }
  const start = optionOrder.indexOf(key)
  for (let i = start + 1; i < optionOrder.length; i += 1) {
    const laterKey = optionOrder[i]
    if (!laterKey) continue
    const currentValue = next[laterKey]
    const values = optionValues(variants, laterKey).filter((candidate) =>
      isOptionValueAvailable(variants, optionOrder, next, laterKey, candidate),
    )
    const stillValid = values.find((candidate) => optionValuesEqual(candidate, currentValue))
    if (stillValid) {
      next[laterKey] = stillValid
      continue
    }
    if (values[0]) {
      next[laterKey] = values[0]
    } else {
      delete next[laterKey]
    }
  }
  return next
}

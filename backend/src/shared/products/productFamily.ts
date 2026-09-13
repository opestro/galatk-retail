/**
 * Galatk workshop creates SKUs as "{category} {variant…}".
 * Built-in families: baggy, chemise, débardeur. Any other base name is a new family.
 */

export interface ProductFamily {
  categoryId: string
  category: string
  variantLabel: string | null
}

const KNOWN_CATEGORIES: Array<{ id: string; match: string[]; display: string }> = [
  { id: 'baggy', match: ['baggy'], display: 'Baggy' },
  { id: 'chemise', match: ['chemise'], display: 'Chemise' },
  { id: 'debardeur', match: ['débardeur', 'debardeur'], display: 'Débardeur' },
]

export const KNOWN_CATEGORY_ORDER = ['baggy', 'chemise', 'debardeur'] as const

function normalizeToken(value: string): string {
  return value
    .normalize('NFD')
    .replace(/\p{M}/gu, '')
    .toLowerCase()
    .trim()
}

function titleCaseWords(value: string): string {
  return value
    .trim()
    .split(/\s+/)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ')
}

function matchKnown(raw: string) {
  const norm = normalizeToken(raw)
  return KNOWN_CATEGORIES.find((cat) => cat.match.some((label) => normalizeToken(label) === norm))
}

function stripPrefix(name: string, prefix: string): string | null {
  const nameNorm = normalizeToken(name)
  const prefixNorm = normalizeToken(prefix)
  if (nameNorm === prefixNorm) {
    return ''
  }
  if (!nameNorm.startsWith(`${prefixNorm} `)) {
    return null
  }
  const words = name.trim().split(/\s+/)
  const prefixWords = prefix.trim().split(/\s+/)
  return words.slice(prefixWords.length).join(' ')
}

export function parseProductFamily(name: string, explicitCategory?: string | null): ProductFamily {
  const trimmedName = name.trim()
  const categoryHint = explicitCategory?.trim()

  if (categoryHint) {
    const known = matchKnown(categoryHint)
    const rest = stripPrefix(trimmedName, categoryHint)
    return {
      categoryId: known?.id ?? normalizeToken(categoryHint),
      category: known?.display ?? titleCaseWords(categoryHint),
      variantLabel: (rest ?? '').trim() || null,
    }
  }

  if (!trimmedName) {
    return { categoryId: 'other', category: 'Other', variantLabel: null }
  }

  const words = trimmedName.split(/\s+/)
  const first = words[0] ?? trimmedName
  const known = matchKnown(first)
  if (known) {
    return {
      categoryId: known.id,
      category: known.display,
      variantLabel: words.slice(1).join(' ').trim() || null,
    }
  }

  return {
    categoryId: normalizeToken(first),
    category: titleCaseWords(first),
    variantLabel: words.slice(1).join(' ').trim() || null,
  }
}

export function compareCategoryIds(a: string, b: string): number {
  const ai = KNOWN_CATEGORY_ORDER.indexOf(a as (typeof KNOWN_CATEGORY_ORDER)[number])
  const bi = KNOWN_CATEGORY_ORDER.indexOf(b as (typeof KNOWN_CATEGORY_ORDER)[number])
  const ao = ai === -1 ? KNOWN_CATEGORY_ORDER.length : ai
  const bo = bi === -1 ? KNOWN_CATEGORY_ORDER.length : bi
  if (ao !== bo) {
    return ao - bo
  }
  return a.localeCompare(b)
}

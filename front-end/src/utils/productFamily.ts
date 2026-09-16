/** Built-in Galatk families; any other first token is a new product family. */
const KNOWN = [
  { id: 'baggy', match: ['baggy'], display: 'Baggy' },
  { id: 'chemise', match: ['chemise'], display: 'Chemise' },
  { id: 'debardeur', match: ['débardeur', 'debardeur'], display: 'Débardeur' },
] as const

const KNOWN_DISPLAY_ORDER = ['Baggy', 'Chemise', 'Débardeur']

export interface FamilyFields {
  name: string
  category?: string
  variantLabel?: string | null
}

export interface ProductFamilyGroup<T> {
  category: string
  variants: T[]
}

function normalizeToken(value: string): string {
  return value
    .normalize('NFD')
    .replace(/\p{M}/gu, '')
    .toLowerCase()
    .trim()
}

function parseFromName(name: string): { category: string; variantLabel: string | null } {
  const words = name.trim().split(/\s+/).filter(Boolean)
  const first = words[0] ?? name
  const known = KNOWN.find((cat) => cat.match.some((label) => normalizeToken(label) === normalizeToken(first)))
  const category = known?.display ?? first.charAt(0).toUpperCase() + first.slice(1)
  const variantLabel = words.slice(1).join(' ').trim() || null
  return { category, variantLabel }
}

export function familyOf(item: FamilyFields): { category: string; variantLabel: string | null } {
  if (item.category?.trim()) {
    return {
      category: item.category.trim(),
      variantLabel: item.variantLabel?.trim() || parseFromName(item.name).variantLabel,
    }
  }
  return parseFromName(item.name)
}

export function variantDisplay(item: FamilyFields & { attributes?: Record<string, string> }): string {
  const attrs = item.attributes ?? {}
  const bits: string[] = []
  if (attrs.color) bits.push(attrs.color)
  if (attrs.size) bits.push(attrs.size)
  for (const key of Object.keys(attrs).sort()) {
    if (key === 'size' || key === 'color') continue
    if (attrs[key]) bits.push(attrs[key])
  }
  if (bits.length) return bits.join(' / ')
  return familyOf(item).variantLabel ?? 'Standard'
}

export function groupByCategory<T extends FamilyFields>(items: T[]): ProductFamilyGroup<T>[] {
  const groups = new Map<string, ProductFamilyGroup<T>>()
  for (const item of items) {
    const { category } = familyOf(item)
    const existing = groups.get(category)
    if (existing) {
      existing.variants.push(item)
    } else {
      groups.set(category, { category, variants: [item] })
    }
  }

  return [...groups.values()].sort((a, b) => {
    const ai = KNOWN_DISPLAY_ORDER.indexOf(a.category)
    const bi = KNOWN_DISPLAY_ORDER.indexOf(b.category)
    const ao = ai === -1 ? KNOWN_DISPLAY_ORDER.length : ai
    const bo = bi === -1 ? KNOWN_DISPLAY_ORDER.length : bi
    if (ao !== bo) return ao - bo
    return a.category.localeCompare(b.category)
  })
}

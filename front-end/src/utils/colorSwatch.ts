/** Visual swatches for known storefront colors; unknown colors fall back to a label chip. */
const SWATCHES: Record<string, string> = {
  noir: '#111827',
  black: '#111827',
  blanc: '#f9fafb',
  white: '#f9fafb',
  vert: '#166534',
  green: '#166534',
  rouge: '#b91c1c',
  red: '#b91c1c',
  bleu: '#1d4ed8',
  blue: '#1d4ed8',
  beige: '#d6c4a8',
  gris: '#6b7280',
  grey: '#6b7280',
  gray: '#6b7280',
  rose: '#db2777',
  pink: '#db2777',
  marron: '#78350f',
  brown: '#78350f',
}

export function colorSwatch(value: string): string | null {
  const key = value
    .normalize('NFD')
    .replace(/\p{M}/gu, '')
    .toLowerCase()
    .trim()
  return SWATCHES[key] ?? null
}

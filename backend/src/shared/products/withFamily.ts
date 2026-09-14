import { parseProductFamily, type ProductFamily } from './productFamily.js'

export function withFamily(product: {
  name: string
  category?: string | null
  variantLabel?: string | null
}): ProductFamily {
  const parsed = parseProductFamily(product.name, product.category)
  return {
    ...parsed,
    variantLabel: product.variantLabel?.trim() || parsed.variantLabel,
  }
}

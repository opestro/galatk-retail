import { parseProductFamily, type ProductFamily } from './productFamily.js'

export function withFamily(product: {
  name: string
  category?: string | null
  variantLabel?: string | null
  family?: { name: string; slug?: string } | null
}): ProductFamily {
  if (product.family?.name) {
    const parsed = parseProductFamily(product.name, product.family.name)
    return {
      categoryId: product.family.slug || parsed.categoryId,
      category: product.family.name,
      variantLabel: product.variantLabel?.trim() || parsed.variantLabel,
    }
  }
  const parsed = parseProductFamily(product.name, product.category)
  return {
    ...parsed,
    variantLabel: product.variantLabel?.trim() || parsed.variantLabel,
  }
}

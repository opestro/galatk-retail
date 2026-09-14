import { describe, expect, it } from 'vitest'
import { parseProductFamily } from '../src/shared/products/productFamily.js'

describe('parseProductFamily', () => {
  it('maps built-in categories and leftover tokens as the variant', () => {
    expect(parseProductFamily('baggy M blanc')).toEqual({
      categoryId: 'baggy',
      category: 'Baggy',
      variantLabel: 'M blanc',
    })
    expect(parseProductFamily('Chemise L')).toEqual({
      categoryId: 'chemise',
      category: 'Chemise',
      variantLabel: 'L',
    })
    expect(parseProductFamily('débardeur')).toEqual({
      categoryId: 'debardeur',
      category: 'Débardeur',
      variantLabel: null,
    })
  })

  it('treats an unknown Galatk base name as a new category', () => {
    expect(parseProductFamily('Robe S', 'Robe')).toEqual({
      categoryId: 'robe',
      category: 'Robe',
      variantLabel: 'S',
    })
  })

  it('keeps multi-word Galatk categories when provided explicitly', () => {
    expect(parseProductFamily('Robe soiree M', 'Robe soiree')).toEqual({
      categoryId: 'robe soiree',
      category: 'Robe Soiree',
      variantLabel: 'M',
    })
  })
})

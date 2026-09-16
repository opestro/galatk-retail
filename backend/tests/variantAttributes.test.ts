import { describe, expect, it } from 'vitest'
import {
  attributesKey,
  canonicalizeAttributes,
  displayVariantLabel,
  parseAttributesFromLabel,
  skuName,
} from '../src/shared/products/variantAttributes.js'

describe('variantAttributes', () => {
  it('builds a stable uniqueness key independent of insertion order and case', () => {
    expect(attributesKey({ Color: 'Vert', Size: 'M' })).toBe('color:vert|size:m')
    expect(attributesKey({ size: 'm', color: 'VERT' })).toBe('color:vert|size:m')
  })

  it('treats empty attributes as the default variant', () => {
    expect(attributesKey({})).toBe('default')
    expect(canonicalizeAttributes({ size: ' ', color: '' })).toEqual({})
  })

  it('parses Galatk leftover labels into size and color', () => {
    expect(parseAttributesFromLabel('M blanc')).toEqual({ size: 'M', color: 'Blanc' })
    expect(parseAttributesFromLabel('Vert')).toEqual({ color: 'Vert' })
    expect(parseAttributesFromLabel('noir L')).toEqual({ color: 'Noir', size: 'L' })
  })

  it('formats SKU names from family + attributes', () => {
    expect(skuName('Baggy', { size: 'M', color: 'Vert' })).toBe('Baggy M Vert')
    expect(displayVariantLabel({ color: 'Vert', size: 'M' })).toBe('Vert / M')
  })
})

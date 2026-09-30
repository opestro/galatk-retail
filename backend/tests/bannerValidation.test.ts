import { describe, it, expect } from 'vitest'
import { CustomError } from '../src/shared/types/error_type.js'
import { readImagePixelSize } from '../src/resources/storage/imageDimensions.js'
import { assertBannerPixelSize } from '../src/modules/settings/bannerValidation.js'

function pngHeader(width: number, height: number): Buffer {
  const buffer = Buffer.alloc(24)
  buffer[0] = 0x89
  buffer[1] = 0x50
  buffer[2] = 0x4e
  buffer[3] = 0x47
  buffer[4] = 0x0d
  buffer[5] = 0x0a
  buffer[6] = 0x1a
  buffer[7] = 0x0a
  buffer.writeUInt32BE(13, 8)
  buffer.write('IHDR', 12)
  buffer.writeUInt32BE(width, 16)
  buffer.writeUInt32BE(height, 20)
  return buffer
}

describe('banner image size rules', () => {
  it('reads PNG width and height from the IHDR chunk', () => {
    expect(readImagePixelSize(pngHeader(2560, 1440))).toEqual({ width: 2560, height: 1440 })
  })

  it('accepts the YouTube recommended 2560×1440 size', () => {
    expect(() => assertBannerPixelSize({ width: 2560, height: 1440 })).not.toThrow()
  })

  it('accepts the YouTube minimum 2048×1152 size', () => {
    expect(() => assertBannerPixelSize({ width: 2048, height: 1152 })).not.toThrow()
  })

  it('rejects images smaller than 2048×1152', () => {
    expect(() => assertBannerPixelSize({ width: 1920, height: 1080 })).toThrow(CustomError)
  })

  it('rejects images that are not 16:9', () => {
    expect(() => assertBannerPixelSize({ width: 2560, height: 2560 })).toThrow(CustomError)
  })
})

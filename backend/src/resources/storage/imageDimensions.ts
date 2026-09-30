import { CustomError } from '../../shared/types/error_type.js'

export interface ImagePixelSize {
  width: number
  height: number
}

/**
 * Reads width/height from JPEG, PNG, WebP, or GIF headers without decoding pixels.
 */
export function readImagePixelSize(buffer: Buffer): ImagePixelSize {
  if (buffer.length < 24) {
    throw new CustomError('INVALID_IMAGE', 'Could not read image dimensions', 400)
  }

  if (buffer[0] === 0x89 && buffer[1] === 0x50 && buffer[2] === 0x4e && buffer[3] === 0x47) {
    return {
      width: buffer.readUInt32BE(16),
      height: buffer.readUInt32BE(20),
    }
  }

  if (buffer[0] === 0x47 && buffer[1] === 0x49 && buffer[2] === 0x46) {
    return {
      width: buffer.readUInt16LE(6),
      height: buffer.readUInt16LE(8),
    }
  }

  if (buffer.toString('ascii', 0, 4) === 'RIFF' && buffer.toString('ascii', 8, 12) === 'WEBP') {
    return readWebpSize(buffer)
  }

  if (buffer[0] === 0xff && buffer[1] === 0xd8) {
    return readJpegSize(buffer)
  }

  throw new CustomError('INVALID_IMAGE', 'Could not read image dimensions', 400)
}

function readJpegSize(buffer: Buffer): ImagePixelSize {
  let offset = 2
  while (offset + 8 < buffer.length) {
    if (buffer[offset] !== 0xff) {
      offset += 1
      continue
    }
    const marker = buffer[offset + 1]
    if (marker === 0xd8 || marker === 0xd9 || (marker >= 0xd0 && marker <= 0xd7)) {
      offset += 2
      continue
    }
    const size = buffer.readUInt16BE(offset + 2)
    const sof =
      marker === 0xc0 ||
      marker === 0xc1 ||
      marker === 0xc2 ||
      marker === 0xc3 ||
      marker === 0xc9 ||
      marker === 0xca ||
      marker === 0xcb
    if (sof && offset + 8 < buffer.length) {
      return {
        height: buffer.readUInt16BE(offset + 5),
        width: buffer.readUInt16BE(offset + 7),
      }
    }
    offset += 2 + size
  }
  throw new CustomError('INVALID_IMAGE', 'Could not read image dimensions', 400)
}

function readWebpSize(buffer: Buffer): ImagePixelSize {
  const kind = buffer.toString('ascii', 12, 16)
  if (kind === 'VP8X' && buffer.length >= 30) {
    const width = 1 + buffer[24] + (buffer[25] << 8) + ((buffer[26] & 0x3f) << 16)
    const height = 1 + buffer[27] + (buffer[28] << 8) + ((buffer[29] & 0x3f) << 16)
    return { width, height }
  }
  if (kind === 'VP8 ' && buffer.length >= 30) {
    return {
      width: buffer.readUInt16LE(26) & 0x3fff,
      height: buffer.readUInt16LE(28) & 0x3fff,
    }
  }
  if (kind === 'VP8L' && buffer.length >= 25) {
    const bits = buffer.readUInt32LE(21)
    return {
      width: (bits & 0x3fff) + 1,
      height: ((bits >> 14) & 0x3fff) + 1,
    }
  }
  throw new CustomError('INVALID_IMAGE', 'Could not read image dimensions', 400)
}

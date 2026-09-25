import { CustomError } from '../../shared/types/error_type.js'
import { readImagePixelSize } from '../../resources/storage/imageDimensions.js'
import {
  BANNER_ASPECT_RATIO,
  BANNER_ASPECT_TOLERANCE,
  BANNER_MAX_BYTES,
  BANNER_MIN_HEIGHT,
  BANNER_MIN_WIDTH,
} from './constants.js'

const ALLOWED_MIME = new Set(['image/jpeg', 'image/png', 'image/webp', 'image/gif'])

export function assertBannerPixelSize(size: { width: number; height: number }): void {
  const { width, height } = size
  if (!Number.isFinite(width) || !Number.isFinite(height) || width < 1 || height < 1) {
    throw new CustomError('INVALID_IMAGE', 'Could not read image dimensions', 400)
  }
  if (width < BANNER_MIN_WIDTH || height < BANNER_MIN_HEIGHT) {
    throw new CustomError(
      'INVALID_IMAGE',
      'Banner images must be at least 2048 × 1152 px (16:9). Recommended size is 2560 × 1440 px.',
      400,
    )
  }
  const ratio = width / height
  if (Math.abs(ratio - BANNER_ASPECT_RATIO) / BANNER_ASPECT_RATIO > BANNER_ASPECT_TOLERANCE) {
    throw new CustomError(
      'INVALID_IMAGE',
      'Banner images must use a 16:9 aspect ratio (recommended 2560 × 1440 px).',
      400,
    )
  }
}

export function assertBannerImageFile(file: {
  buffer?: Buffer
  mimetype?: string
  size?: number
} | undefined): void {
  if (!file) {
    throw new CustomError('VALIDATION_ERROR', 'An image file is required', 400)
  }
  if (!file.mimetype || !ALLOWED_MIME.has(file.mimetype)) {
    throw new CustomError('INVALID_IMAGE', 'Images must be JPEG, PNG, WebP, or GIF', 400)
  }
  if (file.size !== undefined && file.size > BANNER_MAX_BYTES) {
    throw new CustomError('INVALID_IMAGE', 'Banner images must be 8MB or smaller', 400)
  }
  if (!file.buffer) {
    throw new CustomError('VALIDATION_ERROR', 'An image file is required', 400)
  }
  assertBannerPixelSize(readImagePixelSize(file.buffer))
}

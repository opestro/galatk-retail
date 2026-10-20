import path from 'node:path'
import { randomUUID } from 'node:crypto'
import { CustomError } from '../../shared/types/error_type.js'

const ALLOWED_MIME = new Set(['image/jpeg', 'image/png', 'image/webp', 'image/gif'])
const MAX_BYTES = 5 * 1024 * 1024
const RELATIVE_DIR = 'product-images'
/** Homepage / storefront hero images, separate from SKU photos. */
export const BANNER_RELATIVE_DIR = 'banners'

// Lazy import keeps the helpers above usable without a database connection (tests, scripts).
async function db() {
  return (await import('../database/initDatabase.js')).default
}

export function publicImageUrl(filename: string, relativeDir = RELATIVE_DIR): string {
  return `/uploads/${relativeDir}/${filename}`
}

export function extensionForMime(mimeType: string): string {
  if (mimeType === 'image/png') return '.png'
  if (mimeType === 'image/webp') return '.webp'
  if (mimeType === 'image/gif') return '.gif'
  return '.jpg'
}

export function assertImageFile(file: { mimetype?: string; size?: number } | undefined): void {
  if (!file) {
    throw new CustomError('VALIDATION_ERROR', 'An image file is required', 400)
  }
  if (!file.mimetype || !ALLOWED_MIME.has(file.mimetype)) {
    throw new CustomError('INVALID_IMAGE', 'Images must be JPEG, PNG, WebP, or GIF', 400)
  }
  if (file.size !== undefined && file.size > MAX_BYTES) {
    throw new CustomError('INVALID_IMAGE', 'Images must be 5MB or smaller', 400)
  }
}

// ponytail: image bytes live in Postgres (no disk survives a deploy); move to object storage if the catalog grows into GBs.
export async function persistImageBuffer(
  buffer: Buffer,
  mimeType: string,
  relativeDir = RELATIVE_DIR,
): Promise<{ filename: string; url: string }> {
  const filename = `${randomUUID()}${extensionForMime(mimeType)}`
  await (await db()).storedImage.create({ data: { id: `${relativeDir}/${filename}`, mimeType, data: new Uint8Array(buffer) } })
  return { filename, url: publicImageUrl(filename, relativeDir) }
}

export async function deleteStoredImage(filename: string, relativeDir = RELATIVE_DIR): Promise<void> {
  await (await db()).storedImage.deleteMany({ where: { id: `${relativeDir}/${path.basename(filename)}` } })
}

/** Bytes behind a public /uploads/<dir>/<filename> URL, or null when unknown. */
export async function loadStoredImage(relativeDir: string, filename: string) {
  return (await db()).storedImage.findUnique({ where: { id: `${relativeDir}/${path.basename(filename)}` } })
}

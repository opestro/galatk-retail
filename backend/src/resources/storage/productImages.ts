import fs from 'node:fs'
import path from 'node:path'
import { randomUUID } from 'node:crypto'
import { CustomError } from '../../shared/types/error_type.js'

const ALLOWED_MIME = new Set(['image/jpeg', 'image/png', 'image/webp', 'image/gif'])
const MAX_BYTES = 5 * 1024 * 1024
const RELATIVE_DIR = 'product-images'

export function uploadsRoot(): string {
  return path.join(process.cwd(), 'uploads')
}

export function productImagesDir(): string {
  return path.join(uploadsRoot(), RELATIVE_DIR)
}

export function ensureUploadDirs(): void {
  fs.mkdirSync(productImagesDir(), { recursive: true })
}

export function publicImageUrl(filename: string): string {
  return `/uploads/${RELATIVE_DIR}/${filename}`
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

export function persistImageBuffer(buffer: Buffer, mimeType: string): { filename: string; url: string } {
  ensureUploadDirs()
  const filename = `${randomUUID()}${extensionForMime(mimeType)}`
  fs.writeFileSync(path.join(productImagesDir(), filename), buffer)
  return { filename, url: publicImageUrl(filename) }
}

export function deleteStoredImage(filename: string): void {
  const safe = path.basename(filename)
  const full = path.join(productImagesDir(), safe)
  if (fs.existsSync(full)) {
    fs.unlinkSync(full)
  }
}

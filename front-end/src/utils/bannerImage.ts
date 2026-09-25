/** YouTube-style homepage banner (16:9). */
export const BANNER_RECOMMENDED_WIDTH = 2560
export const BANNER_RECOMMENDED_HEIGHT = 1440
export const BANNER_MIN_WIDTH = 2048
export const BANNER_MIN_HEIGHT = 1152
export const BANNER_ASPECT_RATIO = 16 / 9
export const BANNER_ASPECT_TOLERANCE = 0.03
export const BANNER_MAX_BYTES = 8 * 1024 * 1024

export function bannerSizeError(width: number, height: number): string | null {
  if (width < BANNER_MIN_WIDTH || height < BANNER_MIN_HEIGHT) {
    return 'Banner images must be at least 2048 × 1152 px (16:9). Recommended size is 2560 × 1440 px.'
  }
  const ratio = width / height
  if (Math.abs(ratio - BANNER_ASPECT_RATIO) / BANNER_ASPECT_RATIO > BANNER_ASPECT_TOLERANCE) {
    return 'Banner images must use a 16:9 aspect ratio (recommended 2560 × 1440 px).'
  }
  return null
}

export function readFilePixelSize(file: File): Promise<{ width: number; height: number }> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file)
    const image = new Image()
    image.onload = () => {
      URL.revokeObjectURL(url)
      resolve({ width: image.naturalWidth, height: image.naturalHeight })
    }
    image.onerror = () => {
      URL.revokeObjectURL(url)
      reject(new Error('Could not read image dimensions'))
    }
    image.src = url
  })
}

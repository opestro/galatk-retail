/** Fixed primary key for the singleton `SiteSettings` row. */
export const SITE_SETTINGS_ID = 'default'

export const DEFAULT_BANNER_TITLE = 'Shop from All Our Stores'

export const DEFAULT_BANNER_SUBTITLE =
  'Browse products from multiple locations. Choose your preferred shop for each item and enjoy flexible pickup or delivery options.'

export const BANNER_TITLE_MAX = 120
export const BANNER_SUBTITLE_MAX = 400
export const BANNER_IMAGE_MAX = 10
export const DEFAULT_BANNER_INTERVAL_MS = 5000
export const BANNER_INTERVAL_MIN_MS = 2000
export const BANNER_INTERVAL_MAX_MS = 60000

/** YouTube-style 16:9 banner: recommended 2560×1440, minimum 2048×1152. */
export const BANNER_RECOMMENDED_WIDTH = 2560
export const BANNER_RECOMMENDED_HEIGHT = 1440
export const BANNER_MIN_WIDTH = 2048
export const BANNER_MIN_HEIGHT = 1152
export const BANNER_ASPECT_RATIO = 16 / 9
export const BANNER_ASPECT_TOLERANCE = 0.03
export const BANNER_MAX_BYTES = 8 * 1024 * 1024

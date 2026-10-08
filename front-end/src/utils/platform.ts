/** Keyboard hints differ on macOS (⌥/⌘ fallbacks) and are hidden on touch screens. */
export const isMac = /Mac|iPhone|iPad/.test(navigator.platform || navigator.userAgent)
export const isTouchDevice = 'ontouchstart' in window || navigator.maxTouchPoints > 0

/** Label for a POS shortcut, e.g. `F12` on Windows/Linux, `⌘↵` on macOS. */
export function shortcutLabel(win: string, mac: string): string {
  return isMac ? mac : win
}

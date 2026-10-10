import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = dirname(fileURLToPath(import.meta.url))
const load = (code) =>
  JSON.parse(readFileSync(join(root, `../src/i18n/locales/${code}.json`), 'utf8'))

function flatten(value, prefix = '') {
  if (value && typeof value === 'object' && !Array.isArray(value)) {
    return Object.entries(value).flatMap(([key, nested]) =>
      flatten(nested, prefix ? `${prefix}.${key}` : key),
    )
  }
  return [prefix]
}

const enKeys = new Set(flatten(load('en')))
let failed = false

for (const code of ['ar', 'fr']) {
  const keys = new Set(flatten(load(code)))
  const missing = [...enKeys].filter((key) => !keys.has(key))
  const extra = [...keys].filter((key) => !enKeys.has(key))
  if (missing.length || extra.length) {
    failed = true
    console.error(`Locale key mismatch in ${code}.json`)
    if (missing.length) console.error(`Missing in ${code}.json:`, missing.join('\n'))
    if (extra.length) console.error(`Extra in ${code}.json:`, extra.join('\n'))
  }
}

if (failed) process.exit(1)
console.log(`Locale parity OK (${enKeys.size} keys)`)

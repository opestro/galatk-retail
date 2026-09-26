import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = dirname(fileURLToPath(import.meta.url))
const en = JSON.parse(readFileSync(join(root, '../src/i18n/locales/en.json'), 'utf8'))
const ar = JSON.parse(readFileSync(join(root, '../src/i18n/locales/ar.json'), 'utf8'))

function flatten(value, prefix = '') {
  if (value && typeof value === 'object' && !Array.isArray(value)) {
    return Object.entries(value).flatMap(([key, nested]) =>
      flatten(nested, prefix ? `${prefix}.${key}` : key),
    )
  }
  return [prefix]
}

const enKeys = new Set(flatten(en))
const arKeys = new Set(flatten(ar))
const missingInAr = [...enKeys].filter((key) => !arKeys.has(key))
const extraInAr = [...arKeys].filter((key) => !enKeys.has(key))

if (missingInAr.length || extraInAr.length) {
  console.error('Locale key mismatch')
  if (missingInAr.length) console.error('Missing in ar.json:', missingInAr.join('\n'))
  if (extraInAr.length) console.error('Extra in ar.json:', extraInAr.join('\n'))
  process.exit(1)
}

console.log(`Locale parity OK (${enKeys.size} keys)`)

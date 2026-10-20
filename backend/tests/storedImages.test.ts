import { describe, it, expect, vi } from 'vitest'
import type { AddressInfo } from 'node:net'

// In-memory stand-in for the StoredImage table.
const rows = new Map<string, { id: string; mimeType: string; data: Uint8Array }>()
const mockPrisma = {
  storedImage: {
    create: vi.fn(async ({ data }) => (rows.set(data.id, data), data)),
    findUnique: vi.fn(async ({ where }) => rows.get(where.id) ?? null),
    deleteMany: vi.fn(async ({ where }) => ({ count: Number(rows.delete(where.id)) })),
  },
}

vi.mock('../src/resources/database/initDatabase.js', () => ({ default: mockPrisma }))

const { persistImageBuffer, deleteStoredImage, BANNER_RELATIVE_DIR } = await import(
  '../src/resources/storage/productImages.js'
)
const { createExpressApp } = await import('../src/server.js')

describe('stored images', () => {
  it('serves uploaded bytes from the database until deleted', async () => {
    const bytes = Buffer.from([0x89, 0x50, 0x4e, 0x47, 1, 2, 3])
    const stored = await persistImageBuffer(bytes, 'image/png', BANNER_RELATIVE_DIR)
    expect(stored.url).toBe(`/uploads/banners/${stored.filename}`)

    const server = createExpressApp().listen(0)
    const base = `http://127.0.0.1:${(server.address() as AddressInfo).port}`
    try {
      const ok = await fetch(base + stored.url)
      expect(ok.status).toBe(200)
      expect(ok.headers.get('content-type')).toBe('image/png')
      expect(Buffer.from(await ok.arrayBuffer())).toEqual(bytes)

      await deleteStoredImage(stored.filename, BANNER_RELATIVE_DIR)
      expect((await fetch(base + stored.url)).status).toBe(404)
      expect((await fetch(`${base}/uploads/product-images/missing.png`)).status).toBe(404)
    } finally {
      server.close()
    }
  })
})

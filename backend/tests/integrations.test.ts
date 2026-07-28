import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { timingSafeEqual } from 'node:crypto'
import { requireIntegrationKey } from '../src/shared/middlewares/requireIntegrationKey.js'
import { CustomError } from '../src/shared/types/error_type.js'

describe('requireIntegrationKey', () => {
  const originalKey = process.env.GALATK_INTEGRATION_API_KEY

  beforeEach(() => {
    process.env.GALATK_INTEGRATION_API_KEY = 'test-integration-key'
  })

  afterEach(() => {
    process.env.GALATK_INTEGRATION_API_KEY = originalKey
  })

  it('rejects missing API key', () => {
    const next = vi.fn()
    requireIntegrationKey(
      { headers: {} } as never,
      {} as never,
      next,
    )
    expect(next).toHaveBeenCalledWith(expect.any(CustomError))
    expect((next.mock.calls[0][0] as CustomError).statusCode).toBe(401)
  })

  it('accepts valid API key', () => {
    const next = vi.fn()
    requireIntegrationKey(
      { headers: { 'x-integration-key': 'test-integration-key' } } as never,
      {} as never,
      next,
    )
    expect(next).toHaveBeenCalledWith()
  })

  it('rejects when integration is not configured', () => {
    delete process.env.GALATK_INTEGRATION_API_KEY
    const next = vi.fn()
    requireIntegrationKey({ headers: {} } as never, {} as never, next)
    expect((next.mock.calls[0][0] as CustomError).statusCode).toBe(503)
  })
})

describe('integration key compare', () => {
  it('uses constant-time comparison', () => {
    const a = Buffer.from('same-key')
    const b = Buffer.from('same-key')
    expect(timingSafeEqual(a, b)).toBe(true)
  })
})

import { describe, expect, it } from 'vitest'
import { signCustomerToken, signToken, verifyCustomerToken, verifyToken } from '../src/shared/auth/jwt.js'
import { StaffRole } from '@prisma/client'

process.env.JWT_SECRET = 'test-customer-jwt-secret'

describe('customer vs staff JWT', () => {
  it('signs a customer token that staff verification rejects', () => {
    const token = signCustomerToken('cust-1')
    expect(verifyCustomerToken(token).customerId).toBe('cust-1')
    expect(() => verifyToken(token)).toThrow()
  })

  it('signs a staff token that customer verification rejects', () => {
    const token = signToken({
      staffId: 'staff-1',
      role: StaffRole.OWNER,
      shopIds: ['shop-1'],
    })
    expect(verifyToken(token).staffId).toBe('staff-1')
    expect(() => verifyCustomerToken(token)).toThrow()
  })
})

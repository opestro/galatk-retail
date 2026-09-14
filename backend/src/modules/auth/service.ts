import prisma from '../../resources/database/initDatabase.js'
import { hashPassword, verifyPassword } from '../../shared/auth/password.js'
import { signToken } from '../../shared/auth/jwt.js'
import { consumeSsoHandoff, createSsoHandoff } from '../../shared/auth/ssoHandoff.js'
import { CustomError } from '../../shared/types/error_type.js'
import { LoginInput, StaffProfile } from './types.js'
import { StaffRole } from '@prisma/client'

async function resolveShopIds(staffId: string, role: StaffRole): Promise<string[]> {
  if (role === StaffRole.OWNER) {
    const shops = await prisma.shop.findMany({ select: { id: true } })
    return shops.map((s) => s.id)
  }

  const assignments = await prisma.staffShopAssignment.findMany({
    where: { staffId },
    select: { shopId: true },
  })
  return assignments.map((a) => a.shopId)
}

export async function login(input: LoginInput) {
  const staff = await prisma.staffUser.findUnique({
    where: { email: input.email.toLowerCase() },
  })

  if (!staff || !staff.isActive) {
    throw new CustomError('INVALID_CREDENTIALS', 'Invalid email or password', 401)
  }

  const valid = await verifyPassword(input.password, staff.passwordHash)
  if (!valid) {
    throw new CustomError('INVALID_CREDENTIALS', 'Invalid email or password', 401)
  }

  const shopIds = await resolveShopIds(staff.id, staff.role)
  const token = signToken({ staffId: staff.id, role: staff.role, shopIds })

  return {
    token,
    staff: {
      id: staff.id,
      email: staff.email,
      name: staff.name,
      role: staff.role,
      shopIds,
    },
  }
}

export async function getMe(staffId: string): Promise<StaffProfile> {
  const staff = await prisma.staffUser.findUnique({ where: { id: staffId } })

  if (!staff || !staff.isActive) {
    throw new CustomError('UNAUTHORIZED', 'Staff not found', 401)
  }

  const shopIds = await resolveShopIds(staff.id, staff.role)

  return {
    id: staff.id,
    email: staff.email,
    name: staff.name,
    role: staff.role,
    shopIds,
  }
}

/** Issue a one-time SSO code for an active staff email (called via integration key). */
export async function issueSsoCode(emailRaw: string) {
  const email = emailRaw?.toLowerCase().trim()
  if (!email) {
    throw new CustomError('VALIDATION_ERROR', 'Email is required', 400)
  }

  const staff = await prisma.staffUser.findUnique({ where: { email } })
  if (!staff || !staff.isActive) {
    throw new CustomError('NOT_FOUND', 'No active staff account for this email', 404)
  }

  return createSsoHandoff(email)
}

/** Exchange SSO code for a normal staff session (same shape as login). */
export async function exchangeSsoCode(code: string) {
  const email = await consumeSsoHandoff(code)
  const staff = await prisma.staffUser.findUnique({ where: { email } })

  if (!staff || !staff.isActive) {
    throw new CustomError('UNAUTHORIZED', 'Staff not found', 401)
  }

  const shopIds = await resolveShopIds(staff.id, staff.role)
  const token = signToken({ staffId: staff.id, role: staff.role, shopIds })

  return {
    token,
    staff: {
      id: staff.id,
      email: staff.email,
      name: staff.name,
      role: staff.role,
      shopIds,
    },
  }
}

/** Ask workshop (galatk) to issue an SSO code, return browser redirect URL. */
export async function launchWorkshopSso(staffId: string) {
  const staff = await prisma.staffUser.findUnique({ where: { id: staffId } })
  if (!staff || !staff.isActive) {
    throw new CustomError('UNAUTHORIZED', 'Staff not found', 401)
  }

  const galatkApi = process.env.GALATK_API_BASE_URL?.replace(/\/$/, '')
  const galatkWeb = process.env.GALATK_WEB_URL?.replace(/\/$/, '')
  const key = process.env.GALATK_INTEGRATION_API_KEY

  if (!galatkApi || !galatkWeb || !key) {
    throw new CustomError(
      'SSO_DISABLED',
      'Workshop SSO is not configured (GALATK_API_BASE_URL, GALATK_WEB_URL, GALATK_INTEGRATION_API_KEY)',
      503,
    )
  }

  const response = await fetch(`${galatkApi}/integrations/sso/issue`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Integration-Key': key,
    },
    body: JSON.stringify({ email: staff.email }),
  })

  const body = (await response.json().catch(() => ({}))) as {
    data?: { code?: string }
    message?: string
    code?: string
  }

  if (!response.ok) {
    throw new CustomError(
      'SSO_ISSUE_FAILED',
      body.message ?? `Workshop SSO issue failed (${response.status})`,
      response.status >= 400 && response.status < 600 ? response.status : 502,
    )
  }

  const code = body.data?.code ?? body.code
  if (!code) {
    throw new CustomError('SSO_ISSUE_FAILED', 'Workshop did not return an SSO code', 502)
  }

  return {
    redirectUrl: `${galatkWeb}/sso?code=${encodeURIComponent(code)}`,
  }
}

export { hashPassword }

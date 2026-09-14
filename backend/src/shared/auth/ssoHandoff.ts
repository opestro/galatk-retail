import { createHash, randomBytes } from 'node:crypto'
import prisma from '../../resources/database/initDatabase.js'
import { CustomError } from '../types/error_type.js'

const SSO_TTL_MS = 60_000

export function hashSsoCode(code: string): string {
  return createHash('sha256').update(code).digest('hex')
}

export function generateSsoCode(): string {
  return randomBytes(32).toString('base64url')
}

export async function createSsoHandoff(email: string): Promise<{ code: string; expiresAt: Date }> {
  const code = generateSsoCode()
  const expiresAt = new Date(Date.now() + SSO_TTL_MS)
  await prisma.ssoHandoff.create({
    data: {
      codeHash: hashSsoCode(code),
      email: email.toLowerCase().trim(),
      expiresAt,
    },
  })
  return { code, expiresAt }
}

export async function consumeSsoHandoff(code: string): Promise<string> {
  if (!code?.trim()) {
    throw new CustomError('VALIDATION_ERROR', 'SSO code is required', 400)
  }

  const codeHash = hashSsoCode(code.trim())
  const row = await prisma.ssoHandoff.findUnique({ where: { codeHash } })

  if (!row) {
    throw new CustomError('INVALID_SSO_CODE', 'Invalid or expired SSO code', 401)
  }
  if (row.usedAt) {
    throw new CustomError('INVALID_SSO_CODE', 'SSO code already used', 401)
  }
  if (row.expiresAt.getTime() < Date.now()) {
    throw new CustomError('INVALID_SSO_CODE', 'SSO code expired', 401)
  }

  await prisma.ssoHandoff.update({
    where: { id: row.id },
    data: { usedAt: new Date() },
  })

  return row.email
}

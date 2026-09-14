import { Prisma, PrismaClient } from '@prisma/client'
import { parseProductFamily } from './productFamily.js'
import { familySlugFromName } from './variantAttributes.js'

type Db = PrismaClient | Prisma.TransactionClient

export async function findOrCreateProductFamily(
  db: Db,
  name: string,
  extras?: { description?: string | null; categoryHint?: string | null },
) {
  const parsed = parseProductFamily(name, extras?.categoryHint)
  const slug = familySlugFromName(parsed.category)
  const existing = await db.productFamily.findUnique({ where: { slug } })
  if (existing) {
    return existing
  }

  try {
    return await db.productFamily.create({
      data: {
        name: parsed.category,
        slug,
        description: extras?.description?.trim() || null,
        isActive: true,
        availableOnline: true,
      },
    })
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
      const raced = await db.productFamily.findUnique({ where: { slug } })
      if (raced) return raced
    }
    throw error
  }
}

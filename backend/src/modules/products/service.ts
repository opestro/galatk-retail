import prisma from '../../resources/database/initDatabase.js'
import { CustomError } from '../../shared/types/error_type.js'
import { CreateProductInput, UpdateProductInput } from './types.js'

export async function listProducts(query?: string) {
  const where = query
    ? { name: { contains: query, mode: 'insensitive' as const } }
    : {}

  return prisma.product.findMany({
    where,
    orderBy: { name: 'asc' },
  })
}

export async function createProduct(input: CreateProductInput) {
  return prisma.product.create({
    data: {
      name: input.name,
      description: input.description ?? null,
      sellPrice: input.sellPrice,
      galatkProductRef: input.galatkProductRef ?? null,
      isActive: input.isActive ?? true,
      availableOnline: input.availableOnline ?? true,
    },
  })
}

export async function getProductById(productId: string) {
  const product = await prisma.product.findUnique({ where: { id: productId } })
  if (!product) {
    throw new CustomError('PRODUCT_NOT_FOUND', 'Product not found', 404)
  }
  return product
}

export async function updateProduct(productId: string, input: UpdateProductInput) {
  await getProductById(productId)
  return prisma.product.update({
    where: { id: productId },
    data: {
      name: input.name,
      description: input.description,
      sellPrice: input.sellPrice,
      galatkProductRef: input.galatkProductRef,
      isActive: input.isActive,
      availableOnline: input.availableOnline,
    },
  })
}

import prisma from '../../resources/database/initDatabase.js'
import { CreateExampleInput } from './types.js'

export const listExamples = async (page: number, limit: number) => {
  const skip = (page - 1) * limit

  const [items, total] = await prisma.$transaction([
    prisma.example.findMany({
      skip,
      take: limit,
      orderBy: { createdAt: 'desc' },
    }),
    prisma.example.count(),
  ])

  return { items, total }
}

export const getExampleById = async (id: string) => {
  return prisma.example.findUnique({ where: { id } })
}

export const createExample = async (input: CreateExampleInput) => {
  return prisma.example.create({
    data: {
      title: input.title,
      description: input.description ?? null,
    },
  })
}

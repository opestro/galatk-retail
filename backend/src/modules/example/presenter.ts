import { Example } from '@prisma/client'
import { ExampleResponse } from './types.js'

export const examplePresenter = (example: Example): ExampleResponse => {
  return {
    id: example.id,
    title: example.title,
    description: example.description,
    createdAt: example.createdAt,
    updatedAt: example.updatedAt,
  }
}

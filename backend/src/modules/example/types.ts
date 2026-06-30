export type CreateExampleInput = {
  title: string
  description?: string | null
}

export type ExampleResponse = {
  id: string
  title: string
  description?: string | null
  createdAt: Date
  updatedAt: Date
}

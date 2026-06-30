import { Request, Response, NextFunction } from 'express'
import * as ExampleService from './service.js'
import { examplePresenter } from './presenter.js'
import { CustomError } from '../../shared/types/error_type.js'
import { DEFAULT_LIMIT, DEFAULT_PAGE, MAX_LIMIT } from './constants.js'

const parsePositiveInt = (value: unknown, fallback: number) => {
  const parsed = Number.parseInt(String(value ?? ''), 10)
  return Number.isNaN(parsed) || parsed <= 0 ? fallback : parsed
}

export const list = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const page = parsePositiveInt(req.query.page, DEFAULT_PAGE)
    const limit = Math.min(parsePositiveInt(req.query.limit, DEFAULT_LIMIT), MAX_LIMIT)

    const { items, total } = await ExampleService.listExamples(page, limit)

    res.status(200).json({
      data: items.map(examplePresenter),
      page,
      limit,
      total,
    })
  } catch (error) {
    next(error)
  }
}

export const getById = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const paramId = req.params.id
    const id = Array.isArray(paramId) ? paramId[0] : paramId

    if (!id) {
      throw new CustomError('INVALID_ID', 'id is required', 400)
    }

    const example = await ExampleService.getExampleById(id)

    if (!example) {
      throw new CustomError('EXAMPLE_NOT_FOUND', 'Example not found', 404)
    }

    res.status(200).json({ data: examplePresenter(example) })
  } catch (error) {
    next(error)
  }
}

export const create = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { title, description } = req.body

    if (!title || typeof title !== 'string') {
      throw new CustomError('INVALID_TITLE', 'title is required', 400)
    }

    const example = await ExampleService.createExample({ title, description })

    res.status(201).json({ data: examplePresenter(example) })
  } catch (error) {
    next(error)
  }
}

import { ErrorRequestHandler, NextFunction, Request, Response } from 'express'
import { CustomError } from '../shared/types/error_type.js'

export const errorHandler: ErrorRequestHandler = (
  err: Error,
  _req: Request,
  res: Response,
  _next: NextFunction,
) => {
  console.error(err.stack)

  if (err instanceof CustomError) {
    res.status(err.statusCode).json({
      type: err.type,
      message: err.message,
    })
    return
  }

  res.status(500).json({
    type: 'INTERNAL_SERVER_ERROR',
    message: err.message ?? 'Something went wrong!',
  })
}

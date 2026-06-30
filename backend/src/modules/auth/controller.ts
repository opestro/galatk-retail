import { Request, Response, NextFunction } from 'express'
import * as AuthService from './service.js'
import { CustomError } from '../../shared/types/error_type.js'

export async function login(req: Request, res: Response, next: NextFunction) {
  try {
    const { email, password } = req.body

    if (!email || !password) {
      throw new CustomError('VALIDATION_ERROR', 'Email and password are required', 400)
    }

    const result = await AuthService.login({ email, password })
    res.status(200).json(result)
  } catch (error) {
    next(error)
  }
}

export async function me(req: Request, res: Response, next: NextFunction) {
  try {
    if (!req.staff) {
      throw new CustomError('UNAUTHORIZED', 'Authentication required', 401)
    }

    const profile = await AuthService.getMe(req.staff.id)
    res.status(200).json({ staff: profile })
  } catch (error) {
    next(error)
  }
}

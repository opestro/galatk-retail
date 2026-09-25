import { Request, Response, NextFunction } from 'express'
import * as AccountService from './service.js'
import { customerOrderPresenter } from './presenter.js'
import { CustomError } from '../../shared/types/error_type.js'

export async function login(req: Request, res: Response, next: NextFunction) {
  try {
    const { email, password } = req.body
    if (!email || !password) {
      throw new CustomError('VALIDATION_ERROR', 'Email and password are required', 400)
    }
    const result = await AccountService.login({ email, password })
    res.status(200).json(result)
  } catch (error) {
    next(error)
  }
}

export async function register(req: Request, res: Response, next: NextFunction) {
  try {
    const { name, email, phone, password } = req.body
    if (!name || !email || !phone || !password) {
      throw new CustomError('VALIDATION_ERROR', 'Name, email, phone, and password are required', 400)
    }
    const result = await AccountService.register({ name, email, phone, password })
    res.status(201).json(result)
  } catch (error) {
    next(error)
  }
}

export async function me(req: Request, res: Response, next: NextFunction) {
  try {
    if (!req.customer) {
      throw new CustomError('UNAUTHORIZED', 'Authentication required', 401)
    }
    const customer = await AccountService.getMe(req.customer.id)
    res.status(200).json({ customer })
  } catch (error) {
    next(error)
  }
}

export async function listOrders(req: Request, res: Response, next: NextFunction) {
  try {
    if (!req.customer) {
      throw new CustomError('UNAUTHORIZED', 'Authentication required', 401)
    }
    const orders = await AccountService.listOrders(req.customer.id)
    res.status(200).json({ data: orders.map(customerOrderPresenter) })
  } catch (error) {
    next(error)
  }
}

export async function getOrder(req: Request, res: Response, next: NextFunction) {
  try {
    if (!req.customer) {
      throw new CustomError('UNAUTHORIZED', 'Authentication required', 401)
    }
    const orderId = String(req.params.orderId ?? '')
    const order = await AccountService.getOrder(req.customer.id, orderId)
    res.status(200).json({ data: customerOrderPresenter(order) })
  } catch (error) {
    next(error)
  }
}

import { Request, Response, NextFunction } from 'express'
import * as ProductsService from './service.js'
import { productPresenter } from './presenter.js'
import { CustomError } from '../../shared/types/error_type.js'

export async function list(req: Request, res: Response, next: NextFunction) {
  try {
    const q = typeof req.query.q === 'string' ? req.query.q : undefined
    const products = await ProductsService.listProducts(q)
    res.status(200).json({ data: products.map(productPresenter) })
  } catch (error) {
    next(error)
  }
}

export async function create(req: Request, res: Response, next: NextFunction) {
  try {
    const { name, description, unitCost, sellPrice, galatkProductRef, isActive, availableOnline } = req.body

    if (!name || sellPrice === undefined) {
      throw new CustomError('VALIDATION_ERROR', 'name and sellPrice are required', 400)
    }

    const product = await ProductsService.createProduct({
      name,
      description,
      unitCost: unitCost !== undefined ? Number(unitCost) : undefined,
      sellPrice: Number(sellPrice),
      galatkProductRef,
      isActive,
      availableOnline,
    })

    res.status(201).json({ data: productPresenter(product) })
  } catch (error) {
    next(error)
  }
}

export async function getById(req: Request, res: Response, next: NextFunction) {
  try {
    const productId = String(req.params.productId)
    const product = await ProductsService.getProductById(productId)
    res.status(200).json({ data: productPresenter(product) })
  } catch (error) {
    next(error)
  }
}

export async function update(req: Request, res: Response, next: NextFunction) {
  try {
    const productId = String(req.params.productId)
    const { name, description, unitCost, sellPrice, galatkProductRef, isActive, availableOnline } = req.body

    const product = await ProductsService.updateProduct(productId, {
      name,
      description,
      unitCost: unitCost !== undefined ? Number(unitCost) : undefined,
      sellPrice: sellPrice !== undefined ? Number(sellPrice) : undefined,
      galatkProductRef,
      isActive,
      availableOnline,
    })

    res.status(200).json({ data: productPresenter(product) })
  } catch (error) {
    next(error)
  }
}

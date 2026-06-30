import { Request, Response, NextFunction } from 'express'
import * as ShopsService from './service.js'
import { shopPresenter } from './presenter.js'
import { CustomError } from '../../shared/types/error_type.js'

export async function list(req: Request, res: Response, next: NextFunction) {
  try {
    const shops = await ShopsService.listShops(req.staff!)
    res.status(200).json({ data: shops.map(shopPresenter) })
  } catch (error) {
    next(error)
  }
}

export async function create(req: Request, res: Response, next: NextFunction) {
  try {
    const { name, slug, address, contactPhone, serviceCity, deliveryFee, outOfStockDisplay } =
      req.body

    if (!name || !address || !serviceCity || deliveryFee === undefined) {
      throw new CustomError('VALIDATION_ERROR', 'name, address, serviceCity, deliveryFee required', 400)
    }

    const shop = await ShopsService.createShop(req.staff!, {
      name,
      slug,
      address,
      contactPhone,
      serviceCity,
      deliveryFee: Number(deliveryFee),
      outOfStockDisplay,
    })

    res.status(201).json({ data: shopPresenter(shop) })
  } catch (error) {
    next(error)
  }
}

export async function getById(req: Request, res: Response, next: NextFunction) {
  try {
    const shopId = String(req.params.shopId)
    const shop = await ShopsService.getShopById(req.staff!, shopId)
    res.status(200).json({ data: shopPresenter(shop) })
  } catch (error) {
    next(error)
  }
}

export async function update(req: Request, res: Response, next: NextFunction) {
  try {
    const shopId = String(req.params.shopId)
    const { name, address, contactPhone, serviceCity, deliveryFee, outOfStockDisplay, creditReminderDays } =
      req.body

    const shop = await ShopsService.updateShop(req.staff!, shopId, {
      name,
      address,
      contactPhone,
      serviceCity,
      deliveryFee: deliveryFee !== undefined ? Number(deliveryFee) : undefined,
      outOfStockDisplay,
      creditReminderDays: creditReminderDays !== undefined ? Number(creditReminderDays) : undefined,
    })

    res.status(200).json({ data: shopPresenter(shop) })
  } catch (error) {
    next(error)
  }
}

import { Request, Response, NextFunction } from 'express'
import * as StockService from './service.js'
import { CustomError } from '../../shared/types/error_type.js'

export async function listStock(req: Request, res: Response, next: NextFunction) {
  try {
    const shopId = String(req.params.shopId)
    const stock = await StockService.listShopStock(req.staff!, shopId)
    res.status(200).json({
      data: stock.map((s) => ({
        id: s.id,
        shopId: s.shopId,
        productId: s.productId,
        quantity: s.quantity,
        product: {
          id: s.product.id,
          name: s.product.name,
          sellPrice: s.product.sellPrice.toString(),
        },
      })),
    })
  } catch (error) {
    next(error)
  }
}

export async function createInboundTransfer(req: Request, res: Response, next: NextFunction) {
  try {
    const shopId = String(req.params.shopId)
    const { lines, galatkTransferRef, note } = req.body

    const transfer = await StockService.createInboundTransfer(req.staff!, shopId, {
      lines,
      galatkTransferRef,
      note,
    })

    res.status(201).json({ data: transfer })
  } catch (error) {
    next(error)
  }
}

export async function listInboundTransfers(req: Request, res: Response, next: NextFunction) {
  try {
    const shopId = String(req.params.shopId)
    const transfers = await StockService.listInboundTransfers(req.staff!, shopId)
    res.status(200).json({ data: transfers })
  } catch (error) {
    next(error)
  }
}

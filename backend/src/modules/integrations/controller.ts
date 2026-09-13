import { Request, Response, NextFunction } from 'express'
import * as IntegrationService from './service.js'

function presentTransfer(transfer: Awaited<
  ReturnType<typeof IntegrationService.createIntegrationInboundTransfer>
>['transfer']) {
  return {
    id: transfer.id,
    shopId: transfer.shopId,
    galatkTransferRef: transfer.galatkTransferRef,
    note: transfer.note,
    createdAt: transfer.createdAt,
    lines: transfer.lines.map((line) => ({
      id: line.id,
      productId: line.productId,
      quantity: line.quantity,
        product: {
          id: line.product.id,
          name: line.product.name,
          galatkProductRef: line.product.galatkProductRef,
          unitCost: line.product.unitCost.toString(),
          sellPrice: line.product.sellPrice.toString(),
        },
    })),
  }
}

export async function listShops(_req: Request, res: Response, next: NextFunction) {
  try {
    const shops = await IntegrationService.listIntegrationShops()
    res.status(200).json({ data: shops })
  } catch (error) {
    next(error)
  }
}

function presentProduct(
  product: Awaited<ReturnType<typeof IntegrationService.upsertIntegrationProduct>>,
) {
  return {
    id: product.id,
    name: product.name,
    galatkProductRef: product.galatkProductRef,
    category: product.category,
    variantLabel: product.variantLabel,
    unitCost: product.unitCost.toString(),
    sellPrice: product.sellPrice.toString(),
    isActive: product.isActive,
    availableOnline: product.availableOnline,
  }
}

export async function upsertProduct(req: Request, res: Response, next: NextFunction) {
  try {
    const product = await IntegrationService.upsertIntegrationProduct({
      galatkProductRef: req.body?.galatkProductRef,
      name: req.body?.name,
      unitCost: req.body?.unitCost,
      sellPrice: req.body?.sellPrice,
      category: req.body?.category,
    })
    res.status(200).json({ data: presentProduct(product) })
  } catch (error) {
    next(error)
  }
}

export async function createInboundTransfer(req: Request, res: Response, next: NextFunction) {
  try {
    const shopId = String(req.params.shopId)
    const { lines, galatkTransferRef, note } = req.body

    const result = await IntegrationService.createIntegrationInboundTransfer(shopId, {
      lines,
      galatkTransferRef,
      note,
    })

    res.status(result.created ? 201 : 200).json({ data: presentTransfer(result.transfer) })
  } catch (error) {
    next(error)
  }
}

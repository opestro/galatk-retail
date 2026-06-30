import { Prisma } from '@prisma/client'
import { CustomError } from '../types/error_type.js'

export interface StockLine {
  productId: string
  quantity: number
}

export async function decrementShopStock(
  tx: Prisma.TransactionClient,
  shopId: string,
  lines: StockLine[],
): Promise<void> {
  for (const line of lines) {
    const stock = await tx.shopStock.findUnique({
      where: { shopId_productId: { shopId, productId: line.productId } },
    })

    if (!stock || stock.quantity < line.quantity) {
      throw new CustomError(
        'INSUFFICIENT_STOCK',
        `Insufficient stock for product ${line.productId}`,
        409,
      )
    }

    await tx.shopStock.update({
      where: { id: stock.id },
      data: { quantity: stock.quantity - line.quantity },
    })
  }
}

export async function restoreShopStock(
  tx: Prisma.TransactionClient,
  shopId: string,
  lines: StockLine[],
): Promise<void> {
  for (const line of lines) {
    const stock = await tx.shopStock.findUnique({
      where: { shopId_productId: { shopId, productId: line.productId } },
    })

    if (stock) {
      await tx.shopStock.update({
        where: { id: stock.id },
        data: { quantity: stock.quantity + line.quantity },
      })
    } else {
      await tx.shopStock.create({
        data: {
          shopId,
          productId: line.productId,
          quantity: line.quantity,
        },
      })
    }
  }
}

export async function incrementShopStock(
  tx: Prisma.TransactionClient,
  shopId: string,
  lines: StockLine[],
): Promise<void> {
  for (const line of lines) {
    const stock = await tx.shopStock.findUnique({
      where: { shopId_productId: { shopId, productId: line.productId } },
    })

    if (stock) {
      await tx.shopStock.update({
        where: { id: stock.id },
        data: { quantity: stock.quantity + line.quantity },
      })
    } else {
      await tx.shopStock.create({
        data: {
          shopId,
          productId: line.productId,
          quantity: line.quantity,
        },
      })
    }
  }
}

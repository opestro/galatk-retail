import { Request, Response, NextFunction } from 'express'
import multer from 'multer'
import * as ProductsService from './service.js'
import { familyPresenter, imagePresenter, productPresenter } from './presenter.js'
import { CustomError } from '../../shared/types/error_type.js'

const imageUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 },
})

export const uploadFamilyImage = imageUpload.single('image')

function shopIdFrom(req: Request): string | undefined {
  const q = req.query.shopId
  const b = req.body?.shopId
  const value = typeof q === 'string' ? q : typeof b === 'string' ? b : undefined
  return value?.trim() || undefined
}

function assertShopQueryAccess(req: Request, shopId?: string) {
  if (!shopId || !req.staff) return
  if (req.staff.role === 'OWNER') return
  if (!req.staff.shopIds.includes(shopId)) {
    throw new CustomError('SHOP_ACCESS_DENIED', 'You do not have access to this shop', 403)
  }
}

export async function list(req: Request, res: Response, next: NextFunction) {
  try {
    const q = typeof req.query.q === 'string' ? req.query.q : undefined
    const products = await ProductsService.listProducts(q)
    res.status(200).json({ data: products.map((product) => productPresenter(product)) })
  } catch (error) {
    next(error)
  }
}

export async function listFamilies(req: Request, res: Response, next: NextFunction) {
  try {
    const q = typeof req.query.q === 'string' ? req.query.q : undefined
    const shopId = shopIdFrom(req)
    assertShopQueryAccess(req, shopId)
    const families = await ProductsService.listFamilies(q)
    const productIds = families.flatMap((family) => family.products.map((p) => p.id))
    const stock = await ProductsService.stockMapForShop(shopId, productIds)
    res.status(200).json({
      data: families.map((family) => familyPresenter(family, stock, Boolean(shopId))),
    })
  } catch (error) {
    next(error)
  }
}

export async function createFamily(req: Request, res: Response, next: NextFunction) {
  try {
    const { name, description, isActive, availableOnline, variants, shopId } = req.body
    if (!name?.trim()) {
      throw new CustomError('VALIDATION_ERROR', 'name is required', 400)
    }
    const resolvedShopId = typeof shopId === 'string' ? shopId : shopIdFrom(req)
    assertShopQueryAccess(req, resolvedShopId)
    const family = await ProductsService.createFamily({
      name,
      description,
      isActive,
      availableOnline,
      variants,
      shopId: resolvedShopId,
    })
    const stock = await ProductsService.stockMapForShop(
      resolvedShopId,
      family.products.map((p) => p.id),
    )
    res.status(201).json({ data: familyPresenter(family, stock, Boolean(resolvedShopId)) })
  } catch (error) {
    next(error)
  }
}

export async function getFamily(req: Request, res: Response, next: NextFunction) {
  try {
    const familyId = String(req.params.familyId)
    const shopId = shopIdFrom(req)
    assertShopQueryAccess(req, shopId)
    const family = await ProductsService.getFamilyById(familyId)
    const stock = await ProductsService.stockMapForShop(
      shopId,
      family.products.map((p) => p.id),
    )
    res.status(200).json({ data: familyPresenter(family, stock, Boolean(shopId)) })
  } catch (error) {
    next(error)
  }
}

export async function updateFamily(req: Request, res: Response, next: NextFunction) {
  try {
    const familyId = String(req.params.familyId)
    const shopId = shopIdFrom(req)
    assertShopQueryAccess(req, shopId)
    const { name, description, isActive, availableOnline } = req.body
    const family = await ProductsService.updateFamily(familyId, {
      name,
      description,
      isActive,
      availableOnline,
    })
    const stock = await ProductsService.stockMapForShop(
      shopId,
      family.products.map((p) => p.id),
    )
    res.status(200).json({ data: familyPresenter(family, stock, Boolean(shopId)) })
  } catch (error) {
    next(error)
  }
}

export async function addVariant(req: Request, res: Response, next: NextFunction) {
  try {
    const familyId = String(req.params.familyId)
    const { attributes, unitCost, sellPrice, quantity, isActive, availableOnline, shopId } = req.body
    const resolvedShopId = typeof shopId === 'string' ? shopId : shopIdFrom(req)
    assertShopQueryAccess(req, resolvedShopId)
    const result = await ProductsService.upsertFamilyVariant(familyId, {
      attributes: attributes ?? {},
      unitCost: unitCost !== undefined ? Number(unitCost) : undefined,
      sellPrice: sellPrice !== undefined ? Number(sellPrice) : undefined,
      quantity: quantity !== undefined ? Number(quantity) : undefined,
      isActive,
      availableOnline,
      shopId: resolvedShopId,
    })
    const family = await ProductsService.getFamilyById(familyId)
    const stock = await ProductsService.stockMapForShop(
      resolvedShopId,
      family.products.map((p) => p.id),
    )
    res.status(result.created ? 201 : 200).json({
      data: {
        created: result.created,
        product: productPresenter(result.product, stock.get(result.product.id) ?? 0),
        family: familyPresenter(family, stock, Boolean(resolvedShopId)),
      },
    })
  } catch (error) {
    next(error)
  }
}

export async function addImage(req: Request, res: Response, next: NextFunction) {
  try {
    const familyId = String(req.params.familyId)
    const file = req.file
    if (!file) {
      throw new CustomError('VALIDATION_ERROR', 'An image file is required', 400)
    }
    const image = await ProductsService.addFamilyImage(familyId, {
      buffer: file.buffer,
      mimetype: file.mimetype,
      size: file.size,
    })
    res.status(201).json({ data: imagePresenter(image) })
  } catch (error) {
    if ((error as { code?: string }).code === 'LIMIT_FILE_SIZE') {
      next(new CustomError('INVALID_IMAGE', 'Images must be 5MB or smaller', 400))
      return
    }
    next(error)
  }
}

export async function removeImage(req: Request, res: Response, next: NextFunction) {
  try {
    const familyId = String(req.params.familyId)
    const imageId = String(req.params.imageId)
    await ProductsService.removeFamilyImage(familyId, imageId)
    res.status(204).send()
  } catch (error) {
    next(error)
  }
}

export async function create(req: Request, res: Response, next: NextFunction) {
  try {
    const {
      name,
      description,
      unitCost,
      sellPrice,
      galatkProductRef,
      isActive,
      availableOnline,
      category,
      attributes,
      quantity,
      shopId,
    } = req.body

    if (!name || sellPrice === undefined) {
      throw new CustomError('VALIDATION_ERROR', 'name and sellPrice are required', 400)
    }

    const resolvedShopId = typeof shopId === 'string' ? shopId : shopIdFrom(req)
    assertShopQueryAccess(req, resolvedShopId)

    const product = await ProductsService.createProduct({
      name,
      description,
      unitCost: unitCost !== undefined ? Number(unitCost) : undefined,
      sellPrice: Number(sellPrice),
      galatkProductRef,
      isActive,
      availableOnline,
      category,
      attributes,
      quantity: quantity !== undefined ? Number(quantity) : undefined,
      shopId: resolvedShopId,
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
    const { name, description, unitCost, sellPrice, galatkProductRef, isActive, availableOnline, attributes } =
      req.body

    const product = await ProductsService.updateProduct(productId, {
      name,
      description,
      unitCost: unitCost !== undefined ? Number(unitCost) : undefined,
      sellPrice: sellPrice !== undefined ? Number(sellPrice) : undefined,
      galatkProductRef,
      isActive,
      availableOnline,
      attributes,
    })

    res.status(200).json({ data: productPresenter(product) })
  } catch (error) {
    next(error)
  }
}

export async function remove(req: Request, res: Response, next: NextFunction) {
  try {
    const productId = String(req.params.productId)
    await ProductsService.deleteProduct(productId)
    res.status(204).send()
  } catch (error) {
    next(error)
  }
}

export async function setStock(req: Request, res: Response, next: NextFunction) {
  try {
    const productId = String(req.params.productId)
    const shopId = shopIdFrom(req)
    if (!shopId) {
      throw new CustomError('VALIDATION_ERROR', 'shopId is required', 400)
    }
    assertShopQueryAccess(req, shopId)
    const quantity = Number(req.body?.quantity)
    const result = await ProductsService.setVariantStock(productId, shopId, quantity)
    const product = await ProductsService.getProductById(productId)
    res.status(200).json({
      data: {
        ...result,
        product: productPresenter(product, result.quantity),
      },
    })
  } catch (error) {
    next(error)
  }
}

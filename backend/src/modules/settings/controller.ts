import { Request, Response, NextFunction } from 'express'
import multer from 'multer'
import { CustomError } from '../../shared/types/error_type.js'
import { siteSettingsPresenter } from './presenter.js'
import * as SettingsService from './service.js'

const imageUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 8 * 1024 * 1024 },
})

export const uploadBannerImage = imageUpload.single('image')

function multerSizeOrNext(error: unknown, next: NextFunction): boolean {
  if ((error as { code?: string }).code === 'LIMIT_FILE_SIZE') {
    next(new CustomError('INVALID_IMAGE', 'Banner images must be 8MB or smaller', 400))
    return true
  }
  return false
}

export async function getPublic(_req: Request, res: Response, next: NextFunction) {
  try {
    const settings = await SettingsService.getOrCreateSiteSettings()
    res.status(200).json({ data: siteSettingsPresenter(settings) })
  } catch (error) {
    next(error)
  }
}

export async function getAdmin(req: Request, res: Response, next: NextFunction) {
  return getPublic(req, res, next)
}

export async function update(req: Request, res: Response, next: NextFunction) {
  try {
    const { bannerEnabled, bannerTitle, bannerSubtitle, bannerIntervalMs } = req.body
    const settings = await SettingsService.updateSiteSettings({
      bannerEnabled,
      bannerTitle,
      bannerSubtitle,
      bannerIntervalMs,
    })
    res.status(200).json({ data: siteSettingsPresenter(settings) })
  } catch (error) {
    next(error)
  }
}

export async function uploadImage(req: Request, res: Response, next: NextFunction) {
  try {
    const file = req.file
    if (!file) {
      throw new CustomError('VALIDATION_ERROR', 'An image file is required', 400)
    }
    const settings = await SettingsService.addBannerImage({
      buffer: file.buffer,
      mimetype: file.mimetype,
      size: file.size,
    })
    res.status(200).json({ data: siteSettingsPresenter(settings) })
  } catch (error) {
    if (multerSizeOrNext(error, next)) return
    next(error)
  }
}

export async function removeImage(req: Request, res: Response, next: NextFunction) {
  try {
    const imageId = String(req.params.imageId ?? '')
    const settings = await SettingsService.removeBannerImage(imageId)
    res.status(200).json({ data: siteSettingsPresenter(settings) })
  } catch (error) {
    next(error)
  }
}

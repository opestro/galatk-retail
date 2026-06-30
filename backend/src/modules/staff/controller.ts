import { Request, Response, NextFunction } from 'express'
import * as StaffService from './service.js'
import { StaffRole } from '@prisma/client'
import { CustomError } from '../../shared/types/error_type.js'

export async function list(req: Request, res: Response, next: NextFunction) {
  try {
    const staff = await StaffService.listStaff(req.staff!)
    res.status(200).json({ data: staff })
  } catch (error) {
    next(error)
  }
}

export async function create(req: Request, res: Response, next: NextFunction) {
  try {
    const { email, password, name, role, shopIds } = req.body

    if (!email || !password || !name || !role) {
      throw new CustomError('VALIDATION_ERROR', 'email, password, name, role required', 400)
    }

    const created = await StaffService.createStaff(req.staff!, {
      email,
      password,
      name,
      role: role as StaffRole,
      shopIds: shopIds ?? [],
    })

    res.status(201).json({ data: created })
  } catch (error) {
    next(error)
  }
}

export async function update(req: Request, res: Response, next: NextFunction) {
  try {
    const staffId = String(req.params.staffId)
    const { role, isActive, shopIds } = req.body

    const updated = await StaffService.updateStaff(req.staff!, staffId, {
      role: role as StaffRole | undefined,
      isActive,
      shopIds,
    })

    res.status(200).json({ data: updated })
  } catch (error) {
    next(error)
  }
}

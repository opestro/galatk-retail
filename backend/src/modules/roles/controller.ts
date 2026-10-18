import { Request, Response, NextFunction } from 'express'
import * as RolesService from './service.js'

export async function list(_req: Request, res: Response, next: NextFunction) {
  try {
    res.status(200).json({ data: await RolesService.listRoles() })
  } catch (error) {
    next(error)
  }
}

export async function update(req: Request, res: Response, next: NextFunction) {
  try {
    const data = await RolesService.updateRole(String(req.params.role), req.body?.permissions)
    res.status(200).json({ data })
  } catch (error) {
    next(error)
  }
}

export async function createGroup(req: Request, res: Response, next: NextFunction) {
  try {
    res.status(201).json({ data: await RolesService.createGroup(req.body ?? {}) })
  } catch (error) {
    next(error)
  }
}

export async function updateGroup(req: Request, res: Response, next: NextFunction) {
  try {
    res.status(200).json({ data: await RolesService.updateGroup(String(req.params.groupId), req.body ?? {}) })
  } catch (error) {
    next(error)
  }
}

export async function deleteGroup(req: Request, res: Response, next: NextFunction) {
  try {
    await RolesService.deleteGroup(String(req.params.groupId))
    res.status(204).send()
  } catch (error) {
    next(error)
  }
}

import { Request, Response, NextFunction } from 'express'
import * as ClientsService from './service.js'
import {
  clientPresenter,
  clientProfilePresenter,
  ledgerEntryPresenter,
  onlineOrderPurchasePresenter,
  salePurchasePresenter,
} from './presenter.js'

export async function listByShop(req: Request, res: Response, next: NextFunction) {
  try {
    const shopId = String(req.params.shopId)
    const q = typeof req.query.q === 'string' ? req.query.q : undefined
    const activeOnly = req.query.activeOnly === 'true'
    const withBalance = req.query.withBalance === 'true'

    const clients = await ClientsService.listClients(req.staff!, shopId, q, activeOnly, withBalance)
    res.status(200).json({ data: clients.map(clientPresenter) })
  } catch (error) {
    next(error)
  }
}

export async function create(req: Request, res: Response, next: NextFunction) {
  try {
    const shopId = String(req.params.shopId)
    const client = await ClientsService.createClient(req.staff!, shopId, req.body)
    res.status(201).json({ data: clientPresenter(client) })
  } catch (error) {
    next(error)
  }
}

export async function getById(req: Request, res: Response, next: NextFunction) {
  try {
    const clientId = String(req.params.clientId)
    const { client, ledgerPreview } = await ClientsService.getClientProfile(req.staff!, clientId)
    res.status(200).json({ data: clientProfilePresenter(client, ledgerPreview) })
  } catch (error) {
    next(error)
  }
}

export async function update(req: Request, res: Response, next: NextFunction) {
  try {
    const clientId = String(req.params.clientId)
    const client = await ClientsService.updateClient(req.staff!, clientId, req.body)
    res.status(200).json({ data: clientPresenter(client) })
  } catch (error) {
    next(error)
  }
}

export async function getLedger(req: Request, res: Response, next: NextFunction) {
  try {
    const clientId = String(req.params.clientId)
    const entries = await ClientsService.getClientLedger(req.staff!, clientId)
    res.status(200).json({ data: entries.map(ledgerEntryPresenter) })
  } catch (error) {
    next(error)
  }
}

export async function getPurchases(req: Request, res: Response, next: NextFunction) {
  try {
    const clientId = String(req.params.clientId)
    const { sales, onlineOrders } = await ClientsService.getClientPurchases(req.staff!, clientId)
    res.status(200).json({
      data: {
        sales: sales.map(salePurchasePresenter),
        onlineOrders: onlineOrders.map(onlineOrderPurchasePresenter),
      },
    })
  } catch (error) {
    next(error)
  }
}

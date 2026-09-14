/** Catalog upsert from Galatk workshop (no stock movement). */
export interface UpsertIntegrationProductInput {
  galatkProductRef: string
  name: string
  unitCost: string
  sellPrice?: string
  category?: string
}

export interface IntegrationInboundLineInput {
  galatkProductRef: string
  quantity: number
  name: string
  unitCost: string
  sellPrice?: string
  /** Optional workshop family; keeps variants under one retail group when set. */
  category?: string
}

export interface CreateIntegrationInboundInput {
  galatkTransferRef: string
  note?: string
  lines: IntegrationInboundLineInput[]
}

export interface IntegrationShopSummary {
  id: string
  name: string
  slug: string
  address: string
}

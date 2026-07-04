export interface IntegrationInboundLineInput {
  galatkProductRef: string
  quantity: number
  name: string
  unitCost: string
  sellPrice?: string
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

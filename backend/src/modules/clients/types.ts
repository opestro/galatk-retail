export interface CreateClientInput {
  name: string
  phone: string
  email?: string | null
  address?: string | null
  notes?: string | null
  creditLimit?: string | number | null
}

export interface UpdateClientInput {
  name?: string
  phone?: string
  email?: string | null
  address?: string | null
  notes?: string | null
  creditLimit?: string | number | null
  isActive?: boolean
}

export interface ClientResponse {
  id: string
  shopId: string
  name: string
  phone: string
  email: string | null
  address: string | null
  notes: string | null
  creditLimit: string | null
  balance: string
  isActive: boolean
  createdAt: Date
  updatedAt: Date
}

export interface ClientProfileResponse extends ClientResponse {
  ledgerPreview: LedgerEntryResponse[]
}

export interface LedgerEntryResponse {
  id: string
  type: string
  amount: string
  saleId: string | null
  paymentId: string | null
  note: string | null
  createdAt: Date
  recordedBy: { id: string; name: string }
}

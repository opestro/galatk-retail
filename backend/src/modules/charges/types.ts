export interface CreateChargeInput {
  category: string
  amount: string | number
  chargeDate: string
  note?: string | null
}

export interface ChargeResponse {
  id: string
  shopId: string
  category: string
  amount: string
  chargeDate: string
  note: string | null
  status: string
  recordedBy: { id: string; name: string }
  cancelledBy: { id: string; name: string } | null
  cancelledAt: string | null
  cancelReason: string | null
  createdAt: string
}

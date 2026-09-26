import { DeliveryService, FulfillmentType } from '@prisma/client'
import { Decimal } from '@prisma/client/runtime/library'

export interface WilayaFeePair {
  stopdeskFee: Decimal | string | number
  homeFee: Decimal | string | number
}

function toDecimal(value: Decimal | string | number): Decimal {
  return value instanceof Decimal ? value : new Decimal(value)
}

/**
 * Checkout delivery charge. Store pickup is always 0. Courier fees come from
 * the wilaya table; a missing row uses the shop fallback (legacy `deliveryFee`).
 * A stored 0 is free, not "unset".
 */
export function resolveDeliveryFee(input: {
  fulfillmentType: FulfillmentType
  deliveryService?: DeliveryService | null
  rate: WilayaFeePair | null
  fallbackFee: Decimal | string | number
}): Decimal {
  if (input.fulfillmentType !== FulfillmentType.DELIVERY) {
    return new Decimal(0)
  }

  const service = input.deliveryService ?? DeliveryService.HOME
  const fallback = toDecimal(input.fallbackFee)

  if (!input.rate) {
    return fallback
  }

  return service === DeliveryService.STOPDESK
    ? toDecimal(input.rate.stopdeskFee)
    : toDecimal(input.rate.homeFee)
}

/**
 * Courier option on a delivery order. Pickup has no service.
 * Unknown values default to home so older clients keep working.
 */
export function parseDeliveryService(
  fulfillmentType: FulfillmentType,
  value: unknown,
): DeliveryService | null {
  if (fulfillmentType !== FulfillmentType.DELIVERY) {
    return null
  }
  if (value === DeliveryService.STOPDESK || value === 'STOPDESK') {
    return DeliveryService.STOPDESK
  }
  return DeliveryService.HOME
}

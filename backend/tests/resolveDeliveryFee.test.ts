import { describe, expect, it } from 'vitest'
import { DeliveryService, FulfillmentType } from '@prisma/client'
import {
  parseDeliveryService,
  resolveDeliveryFee,
} from '../src/shared/delivery/resolveDeliveryFee.js'

describe('parseDeliveryService', () => {
  it('is null for store pickup', () => {
    expect(parseDeliveryService(FulfillmentType.PICKUP, 'HOME')).toBeNull()
  })

  it('defaults delivery to home when the client omits a service', () => {
    expect(parseDeliveryService(FulfillmentType.DELIVERY, undefined)).toBe(DeliveryService.HOME)
  })

  it('accepts stop desk', () => {
    expect(parseDeliveryService(FulfillmentType.DELIVERY, 'STOPDESK')).toBe(DeliveryService.STOPDESK)
  })
})

describe('resolveDeliveryFee', () => {
  const fallback = 500

  it('is free for pickup', () => {
    expect(
      resolveDeliveryFee({
        fulfillmentType: FulfillmentType.PICKUP,
        deliveryService: null,
        rate: { stopdeskFee: 400, homeFee: 600 },
        fallbackFee: fallback,
      }).toNumber(),
    ).toBe(0)
  })

  it('uses the wilaya stop-desk amount when that service is selected', () => {
    expect(
      resolveDeliveryFee({
        fulfillmentType: FulfillmentType.DELIVERY,
        deliveryService: DeliveryService.STOPDESK,
        rate: { stopdeskFee: 0, homeFee: 800 },
        fallbackFee: fallback,
      }).toNumber(),
    ).toBe(0)
  })

  it('uses the wilaya home amount independently of stop desk', () => {
    expect(
      resolveDeliveryFee({
        fulfillmentType: FulfillmentType.DELIVERY,
        deliveryService: DeliveryService.HOME,
        rate: { stopdeskFee: 200, homeFee: 750 },
        fallbackFee: fallback,
      }).toNumber(),
    ).toBe(750)
  })

  it('falls back to the shop fee when the wilaya has no saved row', () => {
    expect(
      resolveDeliveryFee({
        fulfillmentType: FulfillmentType.DELIVERY,
        deliveryService: DeliveryService.HOME,
        rate: null,
        fallbackFee: fallback,
      }).toNumber(),
    ).toBe(500)
  })
})

import { describe, expect, it } from 'vitest'
import { OrderStatus } from '@prisma/client'
import {
  canTransitionOrderStatus,
  ORDER_STATUS_TRANSITIONS,
} from '../src/shared/orders/statusTransitions.js'

describe('order status transitions', () => {
  it('lets staff move a placed order to pickup, delivery, or cancel', () => {
    expect(ORDER_STATUS_TRANSITIONS[OrderStatus.PLACED]).toEqual([
      OrderStatus.READY_FOR_PICKUP,
      OrderStatus.OUT_FOR_DELIVERY,
      OrderStatus.CANCELLED,
    ])
  })

  it('lets staff switch between pickup and delivery after confirmation', () => {
    expect(canTransitionOrderStatus(OrderStatus.READY_FOR_PICKUP, OrderStatus.OUT_FOR_DELIVERY)).toBe(
      true,
    )
    expect(canTransitionOrderStatus(OrderStatus.OUT_FOR_DELIVERY, OrderStatus.READY_FOR_PICKUP)).toBe(
      true,
    )
  })

  it('does not allow completing an order through a status PATCH', () => {
    expect(canTransitionOrderStatus(OrderStatus.READY_FOR_PICKUP, OrderStatus.COMPLETED)).toBe(false)
    expect(canTransitionOrderStatus(OrderStatus.OUT_FOR_DELIVERY, OrderStatus.COMPLETED)).toBe(false)
    expect(ORDER_STATUS_TRANSITIONS[OrderStatus.COMPLETED]).toEqual([])
    expect(ORDER_STATUS_TRANSITIONS[OrderStatus.CANCELLED]).toEqual([])
  })
})

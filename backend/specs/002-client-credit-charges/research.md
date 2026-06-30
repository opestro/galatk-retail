# Research: Client Credit, Reminders & Shop Charges (002)

**Date**: 2026-06-23

## 1. Client balance & FIFO allocation

**Decision**: Maintain **open credit portions** (`ClientCreditPortion`) per sale credit event; standalone payments allocate to oldest portion with `remainingAmount > 0`. Derive `Client.balance` as sum of open portions (updated in same transaction).

**Rationale**: Clarified FIFO (FR-008); supports void of specific sale credit and age-of-debt for reminders.

**Alternatives considered**:
- Single running balance only → rejected (hard to compute oldest debt age).
- Manual payment allocation UI → rejected for v1 (spec: automatic FIFO).

## 2. Sale payment split

**Decision**: Extend `Sale` with `amountPaid`, `amountOnCredit`, optional `creditApprovedById` (pay-later or limit override). `total = amountPaid + amountOnCredit`. Guest sales: `amountPaid = total`, `amountOnCredit = 0`, `clientId` null.

**Rationale**: Clarification Q1 — POS collected uses `amountPaid` only; credit tracked separately.

## 3. Credit limit null semantics

**Decision**: `Client.creditLimit` nullable; null = unlimited. Enforcement: `currentBalance + newCredit <= limit` only when limit IS NOT NULL.

**Rationale**: Clarification Q3.

## 4. Phone uniqueness

**Decision**: `@unique` on `Client.phone` globally (network-wide).

**Rationale**: Clarification Q5; client still has `shopId` FK.

## 5. Pay-later authorization

**Decision**: API requires `payLater: true` or `amountPaid: 0` with `clientId`; middleware rejects unless `staff.role` is MANAGER or OWNER. Cashiers may send partial pay with `amountPaid > 0`.

**Rationale**: FR-006, FR-017.

## 6. Client payments RBAC

**Decision**: POST payment: CASHIER+ with shop access. Void payment: MANAGER+ only (mirror payment void in spec).

**Rationale**: Clarification Q2.

## 7. Financial summary aggregation

**Decision**: Dashboard query returns five metrics for date range + shop scope:
- `posCollected` = SUM(sale.amountPaid) WHERE status COMPLETED
- `clientPaymentsReceived` = SUM(payment.amount) WHERE status COMPLETED
- `totalCashIn` = posCollected + clientPaymentsReceived
- `outstandingCredit` = SUM(client.balance) snapshot OR sum open portions for shop
- `totalCharges` = SUM(charge.amount) WHERE status ACTIVE

**Rationale**: Clarification Q1 + Q4; FR-016.

## 8. Reminder age

**Decision**: Oldest debt age = `now - MIN(openPortion.createdAt)` for client. Reminder list when age > `shop.creditReminderDays` (default 30).

**Rationale**: FR-012; US5 test scenario.

## 9. Ledger audit

**Decision**: Append-only `ClientLedgerEntry` rows for SALE_CREDIT, PAYMENT, PAYMENT_VOID, SALE_VOID_REVERSAL, ADJUSTMENT; mirrors business events for profile UI.

**Rationale**: FR-009; dispute resolution.

## 10. Module boundaries

**Decision**:
- `clients` — CRUD, search, profile
- `credit` — payments, portions, ledger, reminders, credit dashboard
- `charges` — shop charges CRUD + void
- Extend `pos` — credit checkout
- Extend `dashboard` — financial summary v2

**Rationale**: 001 module pattern; spec assumptions.

## 11. Void credit sale with allocated payments

**Decision**: Block sale void if any payment allocation exists against that sale's credit portions unless manager voids those payments first OR posts ADJUSTMENT (documented in edge case).

**Rationale**: Spec edge case; prevents negative open portions.

## 12. Testing

**Decision**: Vitest unit tests for FIFO allocator, credit limit check, pay-later RBAC, summary aggregations.

**Rationale**: Continue 001 Vitest setup.

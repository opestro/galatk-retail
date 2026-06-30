# Data Model: Client Credit, Reminders & Shop Charges

**Branch**: `002-client-credit-charges` | **Extends**: [001 data-model](../001-retail-platform/data-model.md)

## New enums

```text
ClientLedgerEntryType: SALE_CREDIT | PAYMENT | PAYMENT_VOID | SALE_VOID_REVERSAL | ADJUSTMENT
ClientPaymentStatus: COMPLETED | CANCELLED
ShopChargeStatus: ACTIVE | CANCELLED
PosCheckoutMode: FULL_PAY | PARTIAL_PAY | PAY_LATER   // API input only
```

## Shop (extended)

| Field | Type | Notes |
|-------|------|-------|
| creditReminderDays | Int | Default 30 — days before client appears on reminder list |

## Client (new)

| Field | Type | Notes |
|-------|------|-------|
| id | UUID | PK |
| shopId | UUID | FK Shop — home shop |
| name | String | |
| phone | String | **@unique** network-wide |
| email | String? | |
| address | String? | |
| notes | String? | |
| creditLimit | Decimal? | null = unlimited |
| balance | Decimal | Denormalized; sum of open portions; updated in tx |
| isActive | Boolean | Inactive hidden from POS picker |
| createdAt / updatedAt | DateTime | |

**Rules**: Cannot delete if balance > 0; deactivate instead.

## Sale (extended)

| Field | Type | Notes |
|-------|------|-------|
| clientId | String? | FK Client — activate existing column |
| amountPaid | Decimal | Default = total for guest full pay |
| amountOnCredit | Decimal | Default 0 |
| creditApprovedById | String? | FK StaffUser — pay-later or limit override |

**Constraint**: `amountPaid + amountOnCredit = total` (within rounding).

**Relations**: Add `client Client?`, `creditApprovedBy StaffUser?`, `creditPortions ClientCreditPortion[]`

## ClientCreditPortion (new)

Open slice of debt from a sale (FIFO units).

| Field | Type | Notes |
|-------|------|-------|
| id | UUID | PK |
| clientId | UUID | FK |
| saleId | UUID | FK Sale |
| originalAmount | Decimal | Initial credit from sale |
| remainingAmount | Decimal | Reduced by FIFO payments |
| createdAt | DateTime | Used for debt age |

**On sale credit**: create portion with remaining = amountOnCredit.

**On sale void**: zero remaining; ledger SALE_VOID_REVERSAL.

## ClientPayment (new)

| Field | Type | Notes |
|-------|------|-------|
| id | UUID | PK |
| clientId | UUID | FK |
| shopId | UUID | FK — must match client.shopId |
| amount | Decimal | |
| paymentMethod | PaymentMethod | CASH / CARD |
| status | ClientPaymentStatus | |
| recordedById | UUID | FK StaffUser |
| cancelledById | String? | |
| cancelledAt | DateTime? | |
| cancelReason | String? | |
| createdAt | DateTime | |

## ClientPaymentAllocation (new)

| Field | Type | Notes |
|-------|------|-------|
| id | UUID | PK |
| paymentId | UUID | FK |
| portionId | UUID | FK ClientCreditPortion |
| amount | Decimal | |

## ClientLedgerEntry (new)

| Field | Type | Notes |
|-------|------|-------|
| id | UUID | PK |
| clientId | UUID | FK |
| type | ClientLedgerEntryType | |
| amount | Decimal | Signed: credit +, payment - |
| saleId | String? | |
| paymentId | String? | |
| recordedById | UUID | FK StaffUser |
| note | String? | |
| createdAt | DateTime | |

## CreditReminderContact (new)

| Field | Type | Notes |
|-------|------|-------|
| id | UUID | PK |
| clientId | UUID | FK |
| contactedById | UUID | FK StaffUser |
| contactedAt | DateTime | |
| note | String? | |

## ShopCharge (new)

| Field | Type | Notes |
|-------|------|-------|
| id | UUID | PK |
| shopId | UUID | FK |
| category | String | Seed: team_food, petty_cash, transport, other |
| amount | Decimal | |
| chargeDate | DateTime | |
| note | String? | |
| status | ShopChargeStatus | |
| recordedById | UUID | FK |
| cancelledById | String? | |
| cancelledAt | DateTime? | |
| cancelReason | String? | |
| createdAt | DateTime | |

## Transaction flows

### Partial pay / pay-later sale

1. Validate client, limit (if set), pay-later role.
2. Create Sale with amountPaid, amountOnCredit, clientId.
3. If amountOnCredit > 0: create ClientCreditPortion, increment client.balance, ledger SALE_CREDIT.
4. decrementShopStock (unchanged).

### Client payment (FIFO)

1. Validate amount <= client.balance.
2. Create ClientPayment COMPLETED.
3. Allocate to portions ORDER BY createdAt ASC.
4. Decrease portion.remainingAmount, client.balance.
5. Ledger PAYMENT.

### Void credit sale

1. assertCanVoidSale (MVP rules).
2. If portions have allocations from payments → reject or require payment voids first.
3. Reverse remaining portion amounts from balance.
4. restoreShopStock, ledger SALE_VOID_REVERSAL.

## Indexes

- `Client.phone` unique
- `Client(shopId, isActive, name)`
- `ClientCreditPortion(clientId, remainingAmount, createdAt)`
- `ClientPayment(shopId, createdAt)`
- `ShopCharge(shopId, chargeDate)`
- `ClientLedgerEntry(clientId, createdAt)`

## Migration notes

- Backfill existing `Sale` rows: `amountPaid = total`, `amountOnCredit = 0`.
- Add FK `Sale.clientId` → `Client` (nullable).

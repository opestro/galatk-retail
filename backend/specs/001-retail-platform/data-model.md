# Data Model: Retail Platform (MVP)

**Branch**: `001-retail-platform` | **Database**: PostgreSQL via Prisma

## Enums

```text
StaffRole: OWNER | MANAGER | CASHIER
PaymentMethod: CASH | CARD
OnlinePaymentMethod: PAY_ON_PICKUP | COD
FulfillmentType: PICKUP | DELIVERY
OrderStatus: PLACED | READY_FOR_PICKUP | OUT_FOR_DELIVERY | COMPLETED | CANCELLED
SaleStatus: COMPLETED | CANCELLED
InboundTransferStatus: COMPLETED | CANCELLED
OutOfStockDisplay: HIDE | SHOW_UNAVAILABLE   // shop setting, default SHOW_UNAVAILABLE
```

## Core entities (MVP)

### Shop

| Field | Type | Notes |
|-------|------|-------|
| id | UUID | PK |
| name | String | |
| slug | String | Unique, URL-safe |
| address | String | |
| contactPhone | String? | |
| serviceCity | String | Delivery allowed when customer city matches |
| deliveryFee | Decimal(10,2) | Flat fee |
| outOfStockDisplay | Enum | Storefront behavior |
| createdAt / updatedAt | DateTime | |

**Relations**: staff assignments, stock, transfers, sales, orders.

### StaffUser

| Field | Type | Notes |
|-------|------|-------|
| id | UUID | PK |
| email | String | Unique |
| passwordHash | String | bcrypt |
| name | String | Display / cancelled-by |
| role | StaffRole | |
| isActive | Boolean | |
| createdAt / updatedAt | DateTime | |

### StaffShopAssignment

| Field | Type | Notes |
|-------|------|-------|
| staffId | UUID | FK StaffUser |
| shopId | UUID | FK Shop |
| @@unique([staffId, shopId]) | | OWNER may have all shops via role check |

**Rule**: MANAGER/CASHIER must have ≥1 assignment; access scoped to assigned shops.

### Product

| Field | Type | Notes |
|-------|------|-------|
| id | UUID | PK |
| name | String | |
| description | String? | Storefront |
| sellPrice | Decimal(10,2) | |
| galatkProductRef | String? | Optional workshop reconciliation |
| isActive | Boolean | |
| availableOnline | Boolean | |
| createdAt / updatedAt | DateTime | |

**Note**: Products are network-wide catalog; stock is per shop via `ShopStock`.

### ShopStock

| Field | Type | Notes |
|-------|------|-------|
| id | UUID | PK |
| shopId | UUID | FK |
| productId | UUID | FK |
| quantity | Int | ≥ 0 |
| @@unique([shopId, productId]) | | |

### InboundTransfer

| Field | Type | Notes |
|-------|------|-------|
| id | UUID | PK |
| shopId | UUID | FK |
| galatkTransferRef | String? | Optional |
| recordedById | UUID | FK StaffUser |
| status | InboundTransferStatus | |
| note | String? | |
| createdAt | DateTime | |

### InboundTransferLine

| Field | Type | Notes |
|-------|------|-------|
| id | UUID | PK |
| transferId | UUID | FK |
| productId | UUID | FK |
| quantity | Int | > 0 |

**Transaction**: On create COMPLETED → increment `ShopStock` for each line atomically.

### Sale (POS)

| Field | Type | Notes |
|-------|------|-------|
| id | UUID | PK |
| shopId | UUID | FK |
| cashierId | UUID | FK StaffUser |
| status | SaleStatus | |
| paymentMethod | PaymentMethod | |
| subtotal | Decimal | |
| total | Decimal | |
| clientId | UUID? | **Nullable — Phase 3 hook** |
| cancelledById | UUID? | FK StaffUser |
| cancelledAt | DateTime? | |
| cancelReason | String? | |
| createdAt | DateTime | |

### SaleLine

| Field | Type | Notes |
|-------|------|-------|
| id | UUID | PK |
| saleId | UUID | FK |
| productId | UUID | FK |
| quantity | Int | |
| unitPrice | Decimal | Snapshot at sale time |
| lineTotal | Decimal | |

**Void rules** (service layer):
- CASHIER: `status → CANCELLED` only if `cashierId = actor` AND same calendar day (shop timezone UTC default).
- MANAGER/OWNER: any sale.
- Restore stock for each line on cancel.

### OnlineOrder

| Field | Type | Notes |
|-------|------|-------|
| id | UUID | PK |
| shopId | UUID | FK |
| orderNumber | String | Human-readable unique per shop |
| status | OrderStatus | |
| fulfillmentType | FulfillmentType | |
| customerName | String | Guest checkout |
| customerPhone | String | |
| customerEmail | String? | |
| deliveryAddress | String? | Required if DELIVERY |
| deliveryCity | String? | Must match shop.serviceCity |
| paymentMethod | OnlinePaymentMethod | |
| subtotal | Decimal | |
| deliveryFee | Decimal | 0 if pickup |
| total | Decimal | |
| cancelledById | UUID? | Staff cancel |
| cancelledAt | DateTime? | |
| cancelReason | String? | |
| createdAt | DateTime | |

### OnlineOrderLine

Same pattern as `SaleLine` (productId, quantity, unitPrice, lineTotal).

**Checkout transaction**: Validate stock → create order PLACED → decrement ShopStock → commit.

**Cancel** (unfulfilled only): MANAGER/OWNER or authorized staff → CANCELLED, restore stock.

## State transitions

### OnlineOrder — Pickup path

```text
PLACED → READY_FOR_PICKUP → COMPLETED
PLACED | READY_FOR_PICKUP → CANCELLED (stock restored if not yet restored)
```

### OnlineOrder — Delivery path

```text
PLACED → OUT_FOR_DELIVERY → COMPLETED
PLACED | OUT_FOR_DELIVERY → CANCELLED
```

### Sale

```text
COMPLETED → CANCELLED (void, stock restored)
```

## Validation rules

- `ShopStock.quantity` never negative (DB check + transaction).
- Sale/order line qty ≤ available stock at commit time.
- Delivery orders require `deliveryCity` equal to `shop.serviceCity` (normalized).
- Product must exist and `isActive` for sales.
- `availableOnline` + stock > 0 (or policy) for storefront listing.

## Phase 3 appendix (not migrated in MVP)

Document only — implement in `002-client-credit-charges`:

- **Client**: shopId/network scope, name, phone, creditLimit?
- **ClientLedgerEntry**: SALE_CREDIT, PAYMENT, ADJUSTMENT; amount, clientId, saleId?
- **ShopCharge**: shopId, category, amount, recordedById, status

MVP keeps `Sale.clientId` nullable UUID without FK enforcement until Phase 3.

## Indexes

- `Shop.slug` unique
- `ShopStock(shopId, productId)` unique
- `Sale(shopId, createdAt)`
- `OnlineOrder(shopId, status, createdAt)`
- `StaffUser.email` unique

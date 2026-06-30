# API Contract: Client Credit, Reminders & Shop Charges

**Base URL**: `http://localhost:8080/api/v1`  
**Auth**: Bearer JWT (staff routes)

---

## Clients (`/clients`, `/shops/:shopId/clients`)

| Method | Path | Role | Description |
|--------|------|------|-------------|
| GET | `/shops/:shopId/clients` | CASHIER+ | List/search (`?q=`, active only for POS) |
| POST | `/shops/:shopId/clients` | MANAGER+ | Create client |
| GET | `/clients/:clientId` | CASHIER+ | Profile + balance + ledger preview |
| PATCH | `/clients/:clientId` | MANAGER+ | Update contact, limit, active |
| GET | `/clients/:clientId/ledger` | MANAGER+ | Full ledger history |

**Create body**: `{ name, phone, email?, address?, notes?, creditLimit? }`

---

## POS credit checkout (extends `/shops/:shopId/pos/sales`)

**POST** `/shops/:shopId/pos/sales` — extended body:

```json
{
  "lines": [{ "productId": "uuid", "quantity": 1 }],
  "paymentMethod": "CASH | CARD",
  "clientId": "uuid | null",
  "amountPaid": 100.00,
  "payLater": false,
  "creditLimitOverride": false
}
```

- Guest: omit `clientId`, `amountPaid` must equal computed total.
- Partial pay: `clientId` required, `amountPaid < total`.
- Pay-later: `payLater: true`, `amountPaid: 0`, MANAGER+ only.
- Limit override: `creditLimitOverride: true`, MANAGER+ only when over limit.

**Response**: sale with `amountPaid`, `amountOnCredit`, `clientId`.

---

## Credit payments (`/shops/:shopId/clients/:clientId/payments`)

| Method | Path | Role | Description |
|--------|------|------|-------------|
| POST | `.../payments` | CASHIER+ | `{ amount, paymentMethod }` — FIFO allocate |
| POST | `.../payments/:paymentId/void` | MANAGER+ | `{ reason? }` — restore balance |

---

## Credit dashboard & reminders

| Method | Path | Role | Description |
|--------|------|------|-------------|
| GET | `/shops/:shopId/credit/dashboard` | MANAGER+ | All clients balance > 0 |
| GET | `/shops/:shopId/credit/reminders` | MANAGER+ | Clients past `creditReminderDays` |
| POST | `/clients/:clientId/reminder-contacts` | MANAGER+ | `{ note? }` — log contact |
| PATCH | `/shops/:shopId` | MANAGER+ | Include `creditReminderDays` in shop settings |

---

## Shop charges (`/shops/:shopId/charges`)

| Method | Path | Role | Description |
|--------|------|------|-------------|
| GET | `/shops/:shopId/charges` | MANAGER+ | List (`?from=&to=`) |
| POST | `/shops/:shopId/charges` | MANAGER+ | `{ category, amount, chargeDate, note? }` |
| POST | `/shops/:shopId/charges/:chargeId/void` | MANAGER+ | `{ reason? }` |

---

## Financial summary (extends dashboard)

**GET** `/shops/:shopId/dashboard/financial-summary?from=&to=`

**Response**:

```json
{
  "posCollected": "1000.00",
  "clientPaymentsReceived": "250.00",
  "totalCashIn": "1250.00",
  "outstandingCredit": "300.00",
  "totalCharges": "200.00"
}
```

**GET** `/dashboard/network-financial-summary?from=&to=` — OWNER only, per-shop breakdown + totals.

---

## Manager adjustments (optional v1)

**POST** `/clients/:clientId/adjustments` — MANAGER+ `{ amount, note }` — signed adjustment to balance with ledger ADJUSTMENT.

---

## Status codes

| Code | Usage |
|------|--------|
| 400 | paid + credit ≠ total, payment > balance, duplicate phone |
| 403 | pay-later as cashier, charge as cashier |
| 409 | credit limit exceeded without override |
| 422 | void sale with allocated payments |

---

## Unchanged

Storefront, online orders — no client credit endpoints (FR-018).

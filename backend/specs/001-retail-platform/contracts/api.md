# API Contract: Retail Platform MVP

**Base URL**: `http://localhost:8080/api/v1`  
**Auth**: `Authorization: Bearer <jwt>` on staff routes  
**Errors**: `{ "type": string, "message": string }` with appropriate HTTP status

---

## Auth (`/auth`)

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| POST | `/auth/login` | — | `{ email, password }` → `{ token, staff: { id, name, role, shopIds } }` |
| GET | `/auth/me` | Staff | Current staff profile |

---

## Shops (`/shops`) — OWNER, MANAGER

| Method | Path | Description |
|--------|------|-------------|
| GET | `/shops` | List shops (OWNER: all; MANAGER: assigned) |
| POST | `/shops` | Create shop (OWNER) |
| GET | `/shops/:shopId` | Shop detail |
| PATCH | `/shops/:shopId` | Update name, address, serviceCity, deliveryFee, outOfStockDisplay |

---

## Products (`/products`) — OWNER, MANAGER

| Method | Path | Description |
|--------|------|-------------|
| GET | `/products` | List catalog (`?q=` search) |
| POST | `/products` | Create product |
| GET | `/products/:productId` | Detail |
| PATCH | `/products/:productId` | Update price, online flag, galatkProductRef |

---

## Stock (`/shops/:shopId/stock`) — MANAGER+

| Method | Path | Description |
|--------|------|-------------|
| GET | `/shops/:shopId/stock` | List shop stock with product info |
| POST | `/shops/:shopId/inbound-transfers` | `{ lines: [{ productId, quantity }], galatkTransferRef?, note? }` |
| GET | `/shops/:shopId/inbound-transfers` | Transfer history |

---

## POS (`/shops/:shopId/pos`) — CASHIER+

| Method | Path | Description |
|--------|------|-------------|
| GET | `/shops/:shopId/pos/products` | Products with stock > 0 for register |
| POST | `/shops/:shopId/pos/sales` | `{ lines: [{ productId, quantity }], paymentMethod }` → sale + stock decrement |
| GET | `/shops/:shopId/pos/sales` | Recent sales (`?date=`) |
| GET | `/shops/:shopId/pos/sales/:saleId` | Sale detail |
| POST | `/shops/:shopId/pos/sales/:saleId/void` | `{ reason? }` — void rules enforced |

---

## Orders — staff (`/shops/:shopId/orders`) — CASHIER+

| Method | Path | Description |
|--------|------|-------------|
| GET | `/shops/:shopId/orders` | List online orders (`?status=`) |
| GET | `/shops/:shopId/orders/:orderId` | Detail |
| PATCH | `/shops/:shopId/orders/:orderId/status` | `{ status }` — fulfillment workflow |
| POST | `/shops/:shopId/orders/:orderId/cancel` | `{ reason? }` — cancel + restore stock |

---

## Storefront — public (`/storefront/:shopSlug`)

| Method | Path | Description |
|--------|------|-------------|
| GET | `/storefront/:shopSlug` | Shop public info |
| GET | `/storefront/:shopSlug/products` | Available products + stock status |
| POST | `/storefront/:shopSlug/checkout` | Guest order body below |

**Checkout request**:

```json
{
  "fulfillmentType": "PICKUP | DELIVERY",
  "customerName": "string",
  "customerPhone": "string",
  "customerEmail": "string?",
  "deliveryAddress": "string?",
  "deliveryCity": "string?",
  "lines": [{ "productId": "uuid", "quantity": 1 }]
}
```

**Checkout response**: `{ orderId, orderNumber, total, status: "PLACED" }`

---

## Staff (`/staff`) — OWNER, MANAGER

| Method | Path | Description |
|--------|------|-------------|
| GET | `/staff` | List staff for manageable shops |
| POST | `/staff` | Create staff + assignments |
| PATCH | `/staff/:staffId` | Update role, active, assignments |

---

## Dashboard (`/shops/:shopId/dashboard`) — MANAGER+

| Method | Path | Description |
|--------|------|-------------|
| GET | `/shops/:shopId/dashboard/summary` | Today sales count, revenue, low stock |

---

## Health

| Method | Path | Description |
|--------|------|-------------|
| GET | `/health` | `{ status: "healthy" }` |

---

## Status codes

| Code | Usage |
|------|--------|
| 400 | Validation (city mismatch, empty cart) |
| 401 | Missing/invalid JWT |
| 403 | Role or shop scope denied |
| 404 | Shop/product/order not found |
| 409 | Insufficient stock (concurrent sale) |

---

## Phase 3 (not in MVP routes)

Reserved modules: `/clients`, `/credit`, `/charges` — see spec FR-016–FR-021.

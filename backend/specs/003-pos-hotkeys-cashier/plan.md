# Plan: POS UX, Cashier Orders & Online Client Sync

**Branch**: `003-pos-hotkeys-cashier`

## Tech Stack

TypeScript, Express, Prisma, Vue 3, Tailwind v4, Pinia (unchanged from 001/002).

## Files to Create/Modify

| File | Purpose |
|------|---------|
| `prisma/schema.prisma` | `OnlineOrder.clientId`, `Sale.onlineOrderId` |
| `src/shared/clients/upsertFromOnline.ts` | Find/create client on online checkout |
| `src/modules/storefront/service.ts` | Link client at checkout; `completeOnlineOrder` |
| `src/modules/orders/controller.ts` | `POST .../complete` endpoint |
| `src/modules/credit/service.ts` | Allow CASHIER on credit dashboard |
| `src/modules/pos/service.ts` | Skip stock restore for online-linked sales |
| `front-end/src/composables/usePosHotkeys.ts` | Keyboard shortcuts |
| `front-end/src/layouts/PosLayout.vue` | Sidebar POS shell + hotkey bar |
| `front-end/src/views/pos/PosOrdersView.vue` | Cashier online orders |
| `front-end/src/views/pos/PosCreditsView.vue` | Cashier debt list |
| `front-end/src/components/pos/OrderCompleteModal.vue` | Payment recovery on complete |
| `front-end/src/views/pos/RegisterView.vue` | Hotkeys + UX polish |
| `front-end/src/router/index.ts` | POS routes |

## Key Decisions

- Online order completion creates a **Sale** linked via `onlineOrderId` without stock decrement (stock already taken at checkout).
- Direct transition to `COMPLETED` via PATCH blocked; must use `/complete` with payment body.
- Credit dashboard opened to CASHIER (read-only); reminders stay MANAGER+.

## Constitution Check

✅ No box-shadows; Pinia + Axios; JWT; typed API; persona segregation (cashier POS-only views).

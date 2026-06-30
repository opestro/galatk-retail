# Tasks — POS UX, Cashier Orders & Online Client Sync

## Phase 1: Implementation

- [x] [T01] Schema: OnlineOrder.clientId + Sale.onlineOrderId — `galatk-retail/backend/prisma/schema.prisma`
- [x] [T02] Client upsert helper — `galatk-retail/backend/src/shared/clients/upsertFromOnline.ts`
- [x] [T03] Online checkout links client + completeOrder API — `galatk-retail/backend/src/modules/storefront/service.ts`
- [x] [T04] Orders complete route — `galatk-retail/backend/src/modules/orders/controller.ts`, `index.ts`
- [x] [T05] Cashier credit dashboard + void skip stock for online sales — `credit/service.ts`, `pos/service.ts`
- [x] [T06] [P] POS layout sidebar + routes — `PosLayout.vue`, `router/index.ts`
- [x] [T07] [P] PosOrdersView + OrderCompleteModal — `views/pos/`, `components/pos/`
- [x] [T08] [P] PosCreditsView — `views/pos/PosCreditsView.vue`
- [x] [T09] RegisterView hotkeys + UX — `composables/usePosHotkeys.ts`, `RegisterView.vue`
- [x] [T10] Extend OnlineOrder types — `front-end/src/types/api.ts`

## Phase 2: Validation

- [x] [T11] Run backend tests — `galatk-retail/backend`
- [x] [T12] Mark tasks complete in this file

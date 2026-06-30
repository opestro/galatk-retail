# Tasks: Retail Platform (POS & Online Shop)

**Input**: Design documents from `/specs/001-retail-platform/`  
**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/api.md, quickstart.md

**Organization**: Tasks grouped by user story (US1–US5). **Phase 3** stories (US6–US8 client credit/charges) are **deferred** — see plan.md.

**Tests**: Vitest setup included (plan/research); focused unit tests in Polish phase only (not full TDD).

## Format: `[ID] [P?] [Story] Description`

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Tooling, env, and frontend/backend wiring

- [x] T001 Add Vitest and `test` script to `galatk-retail/backend/package.json` and create `galatk-retail/backend/vitest.config.ts`
- [x] T002 [P] Add `VITE_API_BASE_URL` to `galatk-retail/front-end/.env.example` and document in `galatk-retail/backend/specs/001-retail-platform/quickstart.md`
- [x] T003 [P] Update `galatk-retail/backend/src/config/cors.ts` to allow frontend origin `http://localhost:5173`
- [x] T004 [P] Extend `galatk-retail/backend/config/env.d.ts` with `JWT_SECRET` and `JWT_EXPIRES_IN` types

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Schema, auth, API shell, shared stock logic, frontend auth shell

**⚠️ CRITICAL**: No user story work until this phase is complete

- [x] T005 Implement Prisma schema per `galatk-retail/backend/specs/001-retail-platform/data-model.md` in `galatk-retail/backend/prisma/schema.prisma`
- [x] T006 Create initial migration in `galatk-retail/backend/prisma/migrations/` and run `yarn db:migrate:dev`
- [x] T007 [P] Create seed script `galatk-retail/backend/prisma/seed.ts` (OWNER user, one shop slug `main-shop`, sample products)
- [x] T008 [P] Add bcrypt dependency and password helpers in `galatk-retail/backend/src/shared/auth/password.ts`
- [x] T009 [P] Implement JWT sign/verify in `galatk-retail/backend/src/shared/auth/jwt.ts`
- [x] T010 Implement `requireAuth` and role guards in `galatk-retail/backend/src/shared/middlewares/requireAuth.ts`
- [x] T011 [P] Implement `assertShopAccess` helper in `galatk-retail/backend/src/shared/middlewares/shopScope.ts`
- [x] T012 Implement `decrementShopStock` and `restoreShopStock` in `galatk-retail/backend/src/shared/stock/stockMutations.ts`
- [x] T013 Implement auth module (login, me) in `galatk-retail/backend/src/modules/auth/` (controller, service, types, index.ts)
- [x] T014 Mount `/api/v1` router and module routes in `galatk-retail/backend/src/modules/index.ts`
- [x] T015 [P] Create Pinia auth store in `galatk-retail/front-end/src/stores/auth.ts`
- [x] T016 [P] Create Axios client with JWT interceptors in `galatk-retail/front-end/src/services/api.ts`
- [x] T017 [P] Add route guards and `/login` in `galatk-retail/front-end/src/router/index.ts`
- [x] T018 [P] Create layouts `galatk-retail/front-end/src/layouts/AdminLayout.vue`, `PosLayout.vue`, `StorefrontLayout.vue`
- [x] T019 [P] Add shared API types in `galatk-retail/front-end/src/types/api.ts`

**Checkpoint**: Login works; `/health` and `/api/v1/auth/login` respond; DB seeded

---

## Phase 3: User Story 1 — Receive Workshop Goods Into Shop Stock (Priority: P1) 🎯 MVP core

**Goal**: Managers create products and record manual inbound transfers; shop stock increases with audit trail

**Independent Test**: Create shop + product → inbound transfer 30 units → `GET /shops/:id/stock` shows quantity 30 and transfer history entry

### Implementation for User Story 1

- [x] T020 [P] [US1] Implement shops module in `galatk-retail/backend/src/modules/shops/` (CRUD per contracts/api.md)
- [x] T021 [P] [US1] Implement products module in `galatk-retail/backend/src/modules/products/`
- [x] T022 [US1] Implement stock module with inbound transfers in `galatk-retail/backend/src/modules/stock/` (uses `stockMutations.ts`)
- [x] T023 [P] [US1] Create admin shops view `galatk-retail/front-end/src/views/admin/ShopsView.vue`
- [x] T024 [P] [US1] Create admin products view `galatk-retail/front-end/src/views/admin/ProductsView.vue`
- [x] T025 [US1] Create inbound transfer form `galatk-retail/front-end/src/views/admin/InboundTransferView.vue`
- [x] T026 [US1] Create stock overview `galatk-retail/front-end/src/views/admin/StockView.vue`
- [x] T027 [US1] Wire admin routes for shops/products/stock in `galatk-retail/front-end/src/router/index.ts`

**Checkpoint**: US1 fully testable via admin UI + API without POS or storefront

---

## Phase 4: User Story 2 — In-Store POS Sale (Priority: P1)

**Goal**: Cashier completes sales, stock decrements; void own same-day sale with cancelled-by attribution

**Independent Test**: Sell 2 of 10 units → stock 8; void same day → stock 10; another cashier void denied

### Implementation for User Story 2

- [x] T028 [US2] Implement POS service (create sale, void rules) in `galatk-retail/backend/src/modules/pos/service.ts`
- [x] T029 [US2] Implement POS routes in `galatk-retail/backend/src/modules/pos/index.ts` per `contracts/api.md`
- [x] T030 [P] [US2] Create POS register view `galatk-retail/front-end/src/views/pos/RegisterView.vue`
- [x] T031 [P] [US2] Create POS cart store `galatk-retail/front-end/src/stores/posCart.ts`
- [x] T032 [US2] Create sales history view `galatk-retail/front-end/src/views/pos/SalesHistoryView.vue`
- [x] T033 [US2] Create void dialog `galatk-retail/front-end/src/components/pos/VoidSaleDialog.vue`
- [x] T034 [US2] Wire POS routes in `galatk-retail/front-end/src/router/index.ts`

**Checkpoint**: US1 + US2 work together; POS blocked when stock insufficient

---

## Phase 5: User Story 3 — Customer Online Browse and Purchase (Priority: P2)

**Goal**: Public storefront by shop slug; guest checkout pickup or delivery; stock decrements at checkout

**Independent Test**: Place online order → stock reduced; delivery blocked outside service city; staff cancel restores stock

### Implementation for User Story 3

- [x] T035 [US3] Implement public storefront module in `galatk-retail/backend/src/modules/storefront/` (catalog + checkout)
- [x] T036 [US3] Implement staff orders module in `galatk-retail/backend/src/modules/orders/` (list, status, cancel)
- [x] T037 [P] [US3] Create storefront catalog `galatk-retail/front-end/src/views/storefront/CatalogView.vue`
- [x] T038 [P] [US3] Create cart store `galatk-retail/front-end/src/stores/storefrontCart.ts`
- [x] T039 [US3] Create checkout view `galatk-retail/front-end/src/views/storefront/CheckoutView.vue` (pickup/delivery, city validation)
- [x] T040 [US3] Create order confirmation `galatk-retail/front-end/src/views/storefront/OrderConfirmationView.vue`
- [x] T041 [US3] Create admin orders fulfillment view `galatk-retail/front-end/src/views/admin/OrdersView.vue`
- [x] T042 [US3] Wire storefront routes `/shop/:slug/*` in `galatk-retail/front-end/src/router/index.ts`

**Checkpoint**: US3 independent of POS UI; shares stock pool with US2

---

## Phase 6: User Story 4 — Shop Administration and Staff Access (Priority: P2)

**Goal**: Manager configures shop, manages staff roles, views dashboard summary

**Independent Test**: Cashier cannot access inbound transfers; manager sees today sales and low-stock alerts

### Implementation for User Story 4

- [x] T043 [US4] Implement staff module in `galatk-retail/backend/src/modules/staff/`
- [x] T044 [US4] Implement dashboard summary in `galatk-retail/backend/src/modules/dashboard/`
- [x] T045 [P] [US4] Create staff management view `galatk-retail/front-end/src/views/admin/StaffView.vue`
- [x] T046 [US4] Create shop settings view `galatk-retail/front-end/src/views/admin/ShopSettingsView.vue` (serviceCity, deliveryFee)
- [x] T047 [US4] Create admin dashboard `galatk-retail/front-end/src/views/admin/DashboardView.vue`
- [x] T048 [US4] Enforce role-based nav hiding in `galatk-retail/front-end/src/layouts/AdminLayout.vue` and `PosLayout.vue`

**Checkpoint**: RBAC complete for MVP roles OWNER / MANAGER / CASHIER

---

## Phase 7: User Story 5 — Multi-Shop Expansion (Priority: P3)

**Goal**: Second shop with isolated stock; owner network overview

**Independent Test**: Inbound to Shop 2 only; Shop 1 stock unchanged; owner sees per-shop summaries

### Implementation for User Story 5

- [x] T049 [US5] Audit all services for `shopId` scoping in `galatk-retail/backend/src/modules/*/service.ts`
- [x] T050 [US5] Add owner network summary endpoint in `galatk-retail/backend/src/modules/dashboard/service.ts`
- [x] T051 [US5] Add shop selector for OWNER in `galatk-retail/front-end/src/components/admin/ShopSelector.vue`
- [x] T052 [US5] Create network overview view `galatk-retail/front-end/src/views/admin/NetworkOverviewView.vue`
- [x] T053 [US5] Extend `galatk-retail/backend/prisma/seed.ts` with second shop for acceptance testing

**Checkpoint**: SC-005 — zero cross-shop inventory bleed in manual test

---

## Phase 8: Polish & Cross-Cutting Concerns

**Purpose**: Quality, Phase 3 hooks, validation

- [x] T054 [P] Add Vitest tests for `stockMutations.ts` in `galatk-retail/backend/tests/stockMutations.test.ts`
- [x] T055 [P] Add Vitest tests for POS void rules in `galatk-retail/backend/tests/posVoid.test.ts`
- [x] T056 [P] Add Phase 3 placeholder README in `galatk-retail/backend/src/modules/clients/README.md` (credit/charges deferred)
- [x] T057 [P] Apply constitution UI rules (no shadows, Lucide icons) across `galatk-retail/front-end/src/assets/main.css` and admin/pos views
- [x] T058 Validate full smoke flow per `galatk-retail/backend/specs/001-retail-platform/quickstart.md`

---

## Dependencies & Execution Order

### Phase Dependencies

```text
Phase 1 (Setup) → Phase 2 (Foundational) → US1 → US2 → US3
                                              ↘ US4 (after US2/US3 for dashboard data)
US1–US4 → US5 (multi-shop verification)
All → Phase 8 (Polish)
```

### User Story Dependencies

| Story | Depends on | Notes |
|-------|------------|-------|
| US1 | Foundational | MVP entry — stock + catalog |
| US2 | US1 | Needs products + stock |
| US3 | US1 | Needs products + stock; parallel with US2 after US1 |
| US4 | US1; dashboard richer after US2+US3 | Staff module can start after Foundational; dashboard last |
| US5 | US1–US4 | Verification + owner UI |

### Parallel Opportunities

**After Phase 2 completes:**

- US2 backend (T028–T029) ∥ US3 backend (T035–T036) — different modules
- US1 frontend views (T023–T024) ∥ US1 backend (T020–T021)

**Within US3:**

- T037 Catalog ∥ T038 cart store

---

## Parallel Example: User Story 1

```bash
# Backend modules in parallel:
T020 shops module → galatk-retail/backend/src/modules/shops/
T021 products module → galatk-retail/backend/src/modules/products/

# Frontend admin pages in parallel:
T023 ShopsView.vue
T024 ProductsView.vue
# Then sequential: T022 stock module, T025–T026 transfer + stock views
```

---

## Implementation Strategy

### MVP First (US1 + US2 minimum sell path)

1. Phase 1 + Phase 2  
2. Phase 3 (US1) — stock  
3. Phase 4 (US2) — POS  
4. **STOP**: Shop can receive goods and sell in store  

### Full MVP (per spec P1–P2)

5. Phase 5 (US3) — online  
6. Phase 6 (US4) — admin/RBAC polish  

### Scale

7. Phase 7 (US5) — multi-shop  
8. Phase 8 — tests + quickstart validation  

### Deferred (do not implement in 001)

- US6–US8: client catalog, credit, reminders, shop charges → spec `002-client-credit-charges`

---

## Task Summary

| Phase | Task IDs | Count |
|-------|----------|-------|
| Setup | T001–T004 | 4 |
| Foundational | T005–T019 | 15 |
| US1 | T020–T027 | 8 |
| US2 | T028–T034 | 7 |
| US3 | T035–T042 | 8 |
| US4 | T043–T048 | 6 |
| US5 | T049–T053 | 5 |
| Polish | T054–T058 | 5 |
| **Total** | **T001–T058** | **58** |

**Parallel-marked tasks**: 24  
**Suggested MVP scope**: Phase 1–2 + US1 + US2 (T001–T034)

---

## Notes

- Every sale/order uses `Sale.clientId` nullable column (schema) — no UI until Phase 3
- Manual galatk handoff only: optional `galatkProductRef` / `galatkTransferRef` fields on forms
- Commit after each checkpoint; run `yarn dev` in backend and front-end separately

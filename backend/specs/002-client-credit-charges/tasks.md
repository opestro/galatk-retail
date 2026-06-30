# Tasks: Client Credit, Reminders & Shop Charges

**Input**: Design documents from `/specs/002-client-credit-charges/`  
**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/api.md, quickstart.md  
**Requires**: [001-retail-platform](../001-retail-platform/spec.md) MVP complete

**Organization**: Tasks grouped by user story (US1–US7). Builds on existing `galatk-retail/backend` + `galatk-retail/front-end`.

**Tests**: Vitest unit tests in Polish phase (plan.md); not full TDD per story.

## Format: `[ID] [P?] [Story] Description`

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Types and shared constants for 002 — no new tooling (001 Vitest already exists)

- [x] T001 [P] Extend staff API DTOs for Client, ClientPayment, ShopCharge, FinancialSummary, CreditDashboard in `galatk-retail/front-end/src/types/api.ts`
- [x] T002 [P] Add charge category presets in `galatk-retail/backend/src/shared/charges/categories.ts`
- [x] T003 [P] Add client/credit API helper functions in `galatk-retail/front-end/src/services/api.ts` (stubs calling future endpoints)

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Schema, shared credit logic, module registration — **blocks all user stories**

**⚠️ CRITICAL**: No user story work until this phase is complete

- [x] T004 Add all 002 entities and enums to `galatk-retail/backend/prisma/schema.prisma` per `specs/002-client-credit-charges/data-model.md` (Client, ClientCreditPortion, ClientPayment, ClientPaymentAllocation, ClientLedgerEntry, CreditReminderContact, ShopCharge; extend Sale and Shop)
- [x] T005 Create Prisma migration in `galatk-retail/backend/prisma/migrations/` with backfill `amountPaid = total`, `amountOnCredit = 0` on existing Sale rows; run `yarn db:migrate:dev` and `yarn db:generate`
- [x] T006 [P] Implement FIFO allocator in `galatk-retail/backend/src/shared/credit/fifoAllocator.ts`
- [x] T007 [P] Implement credit limit check helper in `galatk-retail/backend/src/shared/credit/limitCheck.ts`
- [x] T008 [P] Extend shops service to read/write `creditReminderDays` in `galatk-retail/backend/src/modules/shops/service.ts` and `presenter.ts`
- [x] T009 Create module shells `galatk-retail/backend/src/modules/clients/`, `credit/`, `charges/` (index.ts, controller.ts, service.ts, types.ts) and mount routes in `galatk-retail/backend/src/modules/index.ts` per `contracts/api.md`
- [x] T010 [P] Extend `galatk-retail/backend/prisma/seed.ts` with sample clients (two shops, unique phones) and one ShopCharge for acceptance testing
- [x] T011 [P] Replace placeholder `galatk-retail/backend/src/modules/clients/README.md` with 002 module scope note

**Checkpoint**: Migration applied; `/api/v1/health` OK; new routes mounted (may 404 until story implementation)

---

## Phase 3: User Story 1 — Client Catalog (Priority: P1) 🎯 MVP

**Goal**: Managers maintain registered clients; cashiers search/select at POS; phone unique network-wide

**Independent Test**: Create two clients with different phones → search by name → open profile showing zero balance and empty history

### Implementation for User Story 1

- [x] T012 [P] [US1] Implement clients types and validation in `galatk-retail/backend/src/modules/clients/types.ts`
- [x] T013 [US1] Implement clients service (create, list/search, get, update, deactivate; block delete when balance > 0; phone uniqueness) in `galatk-retail/backend/src/modules/clients/service.ts`
- [x] T014 [US1] Implement clients controller and routes in `galatk-retail/backend/src/modules/clients/controller.ts` and `index.ts` per `contracts/api.md`
- [x] T015 [P] [US1] Create admin clients list/create form `galatk-retail/front-end/src/views/admin/ClientsView.vue`
- [x] T016 [P] [US1] Create POS client search/select component `galatk-retail/front-end/src/components/pos/ClientPicker.vue`
- [x] T017 [US1] Wire `/admin/clients` route and POS client picker entry in `galatk-retail/front-end/src/router/index.ts`
- [x] T018 [US1] Add Clients nav link (MANAGER+) in `galatk-retail/front-end/src/layouts/AdminLayout.vue`; hide create/edit from cashier in `PosLayout.vue`

**Checkpoint**: US1 testable — catalog CRUD + POS search; no credit sales yet

---

## Phase 4: User Story 2 — Credit Sales at POS (Priority: P1)

**Goal**: Partial pay, pay-later (manager), credit limit enforcement; stock decrements; void reverses credit

**Independent Test**: Client limit 1000 → sale 200 with 100 paid → balance +100; pay-later 150 → balance +250; stock decrements; void restores stock and balance

### Implementation for User Story 2

- [x] T019 [US2] Extend `CreateSaleInput` and `createSale` in `galatk-retail/backend/src/modules/pos/service.ts` for `clientId`, `amountPaid`, `payLater`, `creditLimitOverride`; create `ClientCreditPortion`, ledger `SALE_CREDIT`, update client balance atomically
- [x] T020 [US2] Extend `voidSale` in `galatk-retail/backend/src/modules/pos/service.ts` to reverse credit portions, reject when allocations exist (422), ledger `SALE_VOID_REVERSAL`
- [x] T021 [US2] Update POS controller/types for extended checkout body in `galatk-retail/backend/src/modules/pos/controller.ts` and `index.ts`
- [x] T022 [P] [US2] Create manager pay-later / limit-override dialog `galatk-retail/front-end/src/components/pos/PayLaterConfirm.vue`
- [x] T023 [US2] Extend `galatk-retail/front-end/src/stores/posCart.ts` for selected client, `amountPaid`, checkout mode (full / partial / pay-later)
- [x] T024 [US2] Extend `galatk-retail/front-end/src/views/pos/RegisterView.vue` with client picker, partial pay input, pay-later flow, and validation (paid + credit = total)

**Checkpoint**: US1 + US2 — credit sales and voids reconcile to client balance

---

## Phase 5: User Story 3 — Record Client Payments (Priority: P1)

**Goal**: Cashiers and managers record standalone debt payments; FIFO allocation; manager void restores balance

**Independent Test**: Client owes 250 → pay 100 → balance 150 → pay 150 → balance 0

### Implementation for User Story 3

- [x] T025 [US3] Implement payment recording with FIFO allocation in `galatk-retail/backend/src/modules/credit/service.ts` using `fifoAllocator.ts`
- [x] T026 [US3] Implement payment void and ledger entries in `galatk-retail/backend/src/modules/credit/service.ts`
- [x] T027 [US3] Implement credit payment routes in `galatk-retail/backend/src/modules/credit/controller.ts` and mount under `/shops/:shopId/clients/:clientId/payments` in `index.ts`
- [x] T028 [P] [US3] Create payment recording modal `galatk-retail/front-end/src/components/pos/ClientPaymentModal.vue`
- [x] T029 [US3] Integrate payment modal in `galatk-retail/front-end/src/views/pos/RegisterView.vue` and POS nav in `galatk-retail/front-end/src/layouts/PosLayout.vue`

**Checkpoint**: US3 — payments decrease balance via FIFO; void restores

---

## Phase 6: User Story 4 — Client Profile & Ledger History (Priority: P2)

**Goal**: Managers view balance, chronological ledger, linked sales; owner sees per-shop balances

**Independent Test**: After mixed sales and payments, profile totals match sum of ledger lines

### Implementation for User Story 4

- [x] T030 [US4] Implement full ledger query and profile aggregation in `galatk-retail/backend/src/modules/clients/service.ts` (`GET /clients/:id`, `GET /clients/:id/ledger`)
- [x] T031 [P] [US4] Implement optional manager adjustment endpoint in `galatk-retail/backend/src/modules/credit/service.ts` (`POST /clients/:clientId/adjustments`)
- [x] T032 [P] [US4] Create client profile view `galatk-retail/front-end/src/views/admin/ClientProfileView.vue` (balance, ledger, record payment, edit client)
- [x] T033 [US4] Wire `/admin/clients/:clientId` route in `galatk-retail/front-end/src/router/index.ts` and link from `ClientsView.vue`

**Checkpoint**: US4 — full audit trail visible on profile

---

## Phase 7: User Story 5 — Credit Reminders (Priority: P2)

**Goal**: Credit dashboard (all debtors); reminder list past threshold; contact logging

**Independent Test**: Two clients — debt 5 days vs 40 days, threshold 30 → only second on reminder list

### Implementation for User Story 5

- [x] T034 [US5] Implement credit dashboard query (balance > 0, oldest debt age) in `galatk-retail/backend/src/modules/credit/service.ts` (`GET /shops/:shopId/credit/dashboard`)
- [x] T035 [US5] Implement reminders list filtered by `creditReminderDays` in `galatk-retail/backend/src/modules/credit/service.ts` (`GET /shops/:shopId/credit/reminders`)
- [x] T036 [US5] Implement reminder contact log endpoint in `galatk-retail/backend/src/modules/credit/controller.ts` (`POST /clients/:clientId/reminder-contacts`)
- [x] T037 [P] [US5] Create credit reminders view `galatk-retail/front-end/src/views/admin/CreditRemindersView.vue` (dashboard + reminder list + mark contacted)
- [x] T038 [US5] Extend `galatk-retail/front-end/src/views/admin/ShopSettingsView.vue` with `creditReminderDays` field; wire admin nav in `AdminLayout.vue`

**Checkpoint**: US5 — reminders and contact log operational

---

## Phase 8: User Story 6 — Shop Operating Charges (Priority: P2)

**Goal**: Managers record and void shop charges; cashiers denied

**Independent Test**: Record charge “team food” 200 → ledger shows entry with recorder name → period summary includes 200

### Implementation for User Story 6

- [x] T039 [P] [US6] Implement charges service (create, list, void) in `galatk-retail/backend/src/modules/charges/service.ts`
- [x] T040 [US6] Implement charges controller and routes in `galatk-retail/backend/src/modules/charges/controller.ts` and `index.ts` per `contracts/api.md`
- [x] T041 [P] [US6] Create charges admin view `galatk-retail/front-end/src/views/admin/ChargesView.vue` (list, create, void with reason)
- [x] T042 [US6] Wire `/admin/charges` route and MANAGER+ nav in `galatk-retail/front-end/src/router/index.ts` and `AdminLayout.vue`

**Checkpoint**: US6 — charges CRUD with audit trail

---

## Phase 9: User Story 7 — Owner Financial Summary (Priority: P3)

**Goal**: Period summary: POS collected, client payments received, total cash in, outstanding credit, charges; network rollup for owner

**Independent Test**: Day with sales 1000 collected, charges 200, outstanding credit 300, client payments 250 → all five figures correct

### Implementation for User Story 7

- [x] T043 [US7] Implement `getFinancialSummary` in `galatk-retail/backend/src/modules/dashboard/service.ts` per `contracts/api.md` (five metrics; POS collected = sum `amountPaid` on completed sales only)
- [x] T044 [US7] Add `GET /dashboard/network-financial-summary` for OWNER in `galatk-retail/backend/src/modules/dashboard/controller.ts` and `index.ts`
- [x] T045 [US7] Extend `galatk-retail/front-end/src/views/admin/DashboardView.vue` with financial summary cards and date-range filter
- [x] T046 [US7] Extend `galatk-retail/front-end/src/views/admin/NetworkOverviewView.vue` with per-shop financial rollup for OWNER

**Checkpoint**: US7 — owner sees full cash picture without spreadsheet

---

## Phase 10: Polish & Cross-Cutting Concerns

**Purpose**: Unit tests, RBAC audit, quickstart validation

- [x] T047 [P] Add Vitest tests for FIFO allocator in `galatk-retail/backend/tests/fifoAllocator.test.ts`
- [x] T048 [P] Add Vitest tests for credit limit logic in `galatk-retail/backend/tests/creditLimit.test.ts`
- [x] T049 [P] Add Vitest tests for credit sale void rules in `galatk-retail/backend/tests/posCreditVoid.test.ts`
- [x] T050 [P] Add Vitest tests for financial summary aggregations in `galatk-retail/backend/tests/financialSummary.test.ts`
- [x] T051 Audit RBAC on all new routes (pay-later cashier 403, charges cashier 403) in `galatk-retail/backend/src/modules/*/controller.ts`
- [x] T052 Validate full smoke flow per `galatk-retail/backend/specs/002-client-credit-charges/quickstart.md`

---

## Dependencies & Execution Order

### Phase Dependencies

```text
Phase 1 (Setup) → Phase 2 (Foundational) → US1 → US2 → US3
                                              ↘ US4 (after US1; richer after US2+US3)
US2 → US5 (reminders need credit portions)
Phase 2 → US6 (charges independent after schema)
US2 + US3 + US6 → US7 (financial summary)
All → Phase 10 (Polish)
```

### User Story Dependencies

| Story | Priority | Depends on | Notes |
|-------|----------|------------|-------|
| US1 | P1 | Foundational | Client catalog foundation |
| US2 | P1 | US1 | Needs clients; creates credit portions |
| US3 | P1 | US2 | FIFO needs open portions |
| US4 | P2 | US1; US2+US3 for data | Profile shell after US1; ledger meaningful after US2+US3 |
| US5 | P2 | US2 | Debt age from `ClientCreditPortion.createdAt` |
| US6 | P2 | Foundational | Independent of client credit flow |
| US7 | P3 | US2, US3, US6 | Summary aggregates all money flows |

### Parallel Opportunities

**After Phase 2 completes:**

- US6 backend (T039–T040) ∥ US1 backend (T012–T014) — different modules
- US1 frontend (T015–T016) ∥ US1 backend (T012–T014)

**After US1 completes:**

- US2 backend (T019–T021) can start while US1 frontend polish finishes

**Within US2:**

- T022 PayLaterConfirm ∥ T023 posCart store

**Within Polish:**

- T047–T050 all parallel test files

---

## Parallel Example: User Story 1

```bash
# Backend in parallel:
T012 clients/types.ts
T013 clients/service.ts  # after T012

# Frontend in parallel:
T015 ClientsView.vue
T016 ClientPicker.vue
# Then sequential: T017 routes, T018 nav
```

---

## Parallel Example: User Story 2

```bash
# Backend first (sequential — same service file):
T019 createSale credit logic → pos/service.ts
T020 voidSale credit reversal → pos/service.ts
T021 controller/types

# Frontend parallel after T021:
T022 PayLaterConfirm.vue
T023 posCart.ts
# Then T024 RegisterView.vue integrates all
```

---

## Implementation Strategy

### MVP First (US1 + US2 + US3 — minimum credit loop)

1. Phase 1 + Phase 2  
2. Phase 3 (US1) — client catalog  
3. Phase 4 (US2) — credit sales at POS  
4. Phase 5 (US3) — record payments  
5. **STOP**: Shop can sell on credit and collect debt payments  

### Operational completeness (P2)

6. Phase 6 (US4) — profile & ledger  
7. Phase 7 (US5) — reminders  
8. Phase 8 (US6) — shop charges  

### Owner reporting (P3)

9. Phase 9 (US7) — financial summary  

### Quality

10. Phase 10 — tests + quickstart validation  

### Parallel Team Strategy

With two developers after Phase 2:

- **Dev A**: US1 → US2 → US3 (critical path)  
- **Dev B**: US6 charges + US5 reminders prep (after US2 for US5)  

---

## Task Summary

| Phase | Task IDs | Count |
|-------|----------|-------|
| Setup | T001–T003 | 3 |
| Foundational | T004–T011 | 8 |
| US1 Client catalog | T012–T018 | 7 |
| US2 Credit sales | T019–T024 | 6 |
| US3 Client payments | T025–T029 | 5 |
| US4 Profile & ledger | T030–T033 | 4 |
| US5 Reminders | T034–T038 | 5 |
| US6 Shop charges | T039–T042 | 4 |
| US7 Financial summary | T043–T046 | 4 |
| Polish | T047–T052 | 6 |
| **Total** | **T001–T052** | **52** |

**Parallel-marked tasks**: 22  
**Suggested MVP scope**: Phase 1–2 + US1 + US2 + US3 (T001–T029)

---

## Independent Test Criteria (by story)

| Story | How to verify independently |
|-------|------------------------------|
| US1 | Create/search clients; duplicate phone rejected; cashier cannot edit limits |
| US2 | Partial pay and pay-later update balance; limit blocks; void reverses credit + stock |
| US3 | FIFO payment allocation; balance never negative; payment void restores |
| US4 | Ledger lines sum to displayed balance; sale links resolve |
| US5 | Reminder list respects threshold; contact log persists |
| US6 | Charge create/void audit; cashier denied |
| US7 | Five summary metrics match seeded transactions; network rollup for owner |

---

## Notes

- Online storefront unchanged — no client credit (FR-018)
- `Sale.clientId` column exists from 001; activate FK in T004 migration
- Pay-later and credit-limit override require MANAGER+ at API and UI
- Null `creditLimit` = unlimited until limit set (clarification 2026-06-23)
- Commit after each checkpoint; run `yarn dev` in backend and front-end separately
- Run `/speckit.implement` to execute tasks in phase order

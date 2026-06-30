# Implementation Plan: Client Credit, Reminders & Shop Charges

**Branch**: `002-client-credit-charges` | **Date**: 2026-06-23 | **Spec**: [spec.md](./spec.md)  
**Input**: Post-MVP completion — client catalog, POS credit, payments, reminders, shop charges, financial summary.

## Summary

Extend **galatk-retail** (001 MVP) with **registered clients**, **POS partial pay / pay-later**, **FIFO debt payments**, **credit reminders**, **shop operating charges**, and an enhanced **financial summary** (POS collected, client payments received, outstanding credit, charges). Builds on existing `Sale.clientId` placeholder, module pattern, and Vitest.

**Approach**: Prisma migration for new entities; modules `clients`, `credit`, `charges`; extend `pos` checkout and `dashboard` aggregations; admin + POS frontend views.

## Technical Context

**Language/Version**: TypeScript 5.x, Node.js 22+  
**Primary Dependencies**: Express 5, Prisma 6, PostgreSQL; Vue 3, Pinia, Tailwind v4, Axios (unchanged from 001)  
**Storage**: PostgreSQL — migration adds Client, ClientCreditPortion, ClientPayment, ClientLedgerEntry, ShopCharge, etc.  
**Testing**: Vitest — FIFO, limit checks, pay-later RBAC, financial summary  
**Target Platform**: Web (admin + POS)  
**Project Type**: `galatk-retail/backend` + `galatk-retail/front-end`  
**Performance Goals**: Client search & POS credit checkout < 2s p95; credit dashboard load < 3s  
**Constraints**: In-store credit only; phone unique network-wide; clarifications session 2026-06-23 baked in  
**Scale/Scope**: ~3 new backend modules, extend 2; ~8–10 new frontend views/components

## Constitution Check

| Principle | Status |
|-----------|--------|
| I. No box-shadows | ✅ Continue Tailwind border-based UI |
| II. Pinia + Axios | ✅ New stores: optional `clients` cache; API via `services/api.ts` |
| III. JWT interceptors | ✅ Unchanged |
| IV. Strong typing | ✅ Extend `src/types/api.ts` for credit/charge DTOs |
| V. Persona segregation | ✅ Admin: clients/charges/reminders; POS: credit checkout + payment modal |

**Post-design re-check**: ✅ Pass. No violations.

## Project Structure

### Documentation

```text
specs/002-client-credit-charges/
├── plan.md
├── research.md
├── data-model.md
├── quickstart.md
├── contracts/api.md
└── tasks.md          # /speckit.tasks
```

### Source Code (delta)

```text
galatk-retail/backend/
├── prisma/schema.prisma          # migration 002
├── src/
│   ├── modules/
│   │   ├── clients/              # NEW
│   │   ├── credit/               # NEW — payments, reminders, dashboard
│   │   ├── charges/              # NEW
│   │   ├── pos/                  # EXTEND createSale, voidSale
│   │   └── dashboard/            # EXTEND financial-summary
│   └── shared/
│       └── credit/               # NEW — fifoAllocator, limitCheck
└── tests/
    ├── fifoAllocator.test.ts
    ├── creditLimit.test.ts
    └── financialSummary.test.ts

galatk-retail/front-end/src/
├── views/admin/
│   ├── ClientsView.vue           # NEW
│   ├── ClientProfileView.vue     # NEW
│   ├── CreditRemindersView.vue   # NEW
│   ├── ChargesView.vue           # NEW
│   └── DashboardView.vue         # EXTEND financial summary
├── views/pos/
│   ├── RegisterView.vue          # EXTEND client picker, partial pay
│   └── ClientPaymentView.vue     # NEW (or modal)
└── components/
    ├── pos/ClientPicker.vue
    └── pos/PayLaterConfirm.vue   # manager auth
```

## Implementation Milestones

| Milestone | Stories | Deliverables |
|-----------|---------|--------------|
| **M1 Schema** | — | Prisma migration, backfill Sale.amountPaid |
| **M2 Clients** | US1, US4 partial | `clients` module + admin UI |
| **M3 POS credit** | US2 | Extend pos service, credit portions, limit/ pay-later |
| **M4 Payments** | US3 | FIFO payments, void, ledger |
| **M5 Reminders** | US5 | Dashboard, reminder list, contact log |
| **M6 Charges** | US6 | charges module + admin UI |
| **M7 Financial summary** | US7 | dashboard financial-summary API + UI |
| **M8 Polish** | — | Vitest, quickstart validation |

## Phase 0: Research

Complete — [research.md](./research.md).

## Phase 1: Design

Complete — [data-model.md](./data-model.md), [contracts/api.md](./contracts/api.md), [quickstart.md](./quickstart.md).

**Critical integration points**:

1. `createSale` — accept `clientId`, `amountPaid`, `payLater`; create `ClientCreditPortion` when credit > 0.
2. `voidSale` — reverse credit portions; block if allocations exist.
3. `getFinancialSummary` — five metrics per clarifications.

## Phase 2: Tasks

Run **`/speckit.tasks`** to generate `tasks.md`.

## Complexity Tracking

None required.

## Dependencies

- **001-retail-platform** deployed (POS, shops, dashboard shell).
- Spec clarifications 2026-06-23 (collected vs payments, phone unique, unlimited limit null).

## References

- [002 spec](./spec.md)
- [001 spec](../001-retail-platform/spec.md) FR-016–FR-021

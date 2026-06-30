# Implementation Plan: Retail Platform (POS & Online Shop)

**Branch**: `001-retail-platform` | **Date**: 2026-06-23 | **Spec**: [spec.md](./spec.md)  
**Input**: Feature specification from `/specs/001-retail-platform/spec.md`

## Summary

Build **galatk-retail** as a standalone retail system: module-based **Express + Prisma + PostgreSQL** backend and **Vue 3 + Tailwind v4** frontend with **admin**, **POS**, and **public storefront** surfaces. MVP delivers manual workshop handoff (inbound stock), shared shop inventory, in-store sales with void rules, guest online checkout (pickup + delivery), and staff RBAC—scoped by `shopId` from day one for multi-shop. Phase 3 (client credit, reminders, shop charges) is **out of MVP scope** but `Sale.clientId` and module placeholders are reserved.

**Technical approach**: Feature modules under `backend/src/modules/{feature}/`; atomic stock mutations in Prisma transactions; JWT staff auth; public storefront by `shopSlug`; path-based frontend routing (`/admin`, `/pos`, `/shop/:slug`).

## Technical Context

**Language/Version**: TypeScript 5.x (backend + frontend), Node.js 22+  
**Primary Dependencies**: Express 5, Prisma 6, PostgreSQL; Vue 3, Vite 8, Vue Router 5, Pinia 3, Tailwind CSS v4, Axios  
**Storage**: PostgreSQL (`galatk-retail/backend/prisma/schema.prisma`) — separate DB from galatk workshop  
**Testing**: Vitest (backend unit tests — to add); manual + optional Playwright smoke per quickstart  
**Target Platform**: Web (desktop POS + mobile-friendly storefront)  
**Project Type**: Split repo — `galatk-retail/backend` + `galatk-retail/front-end`  
**Performance Goals**: POS product search & checkout < 2s p95; storefront checkout < 5 min user flow (spec SC-001, SC-004)  
**Constraints**: Online-only (no offline POS v1); no payment gateway; manual galatk integration; constitution UI (no box-shadows, Lucide icons)  
**Scale/Scope**: 1 shop at launch, data model for N shops; ~10 backend modules, ~15–20 frontend views for MVP

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Principle | Status |
|-----------|--------|
| I. Strict UI Fidelity (no shadows) | ✅ Plan uses Tailwind borders/spacing; enforce in frontend implementation |
| II. Centralized state & API (Pinia + Axios) | ✅ `src/services/api.ts` + stores; no raw fetch in components |
| III. Interceptor-driven JWT auth | ✅ Request/response interceptors for token + 401 → login |
| IV. Strong typing | ✅ Shared types in `src/types/`; Prisma types on backend |
| V. Persona segregation | ✅ `/admin`, `/pos`, `/shop` route groups + layout components |

**Post-design re-check**: ✅ No violations. Complexity Tracking table not required.

## Project Structure

### Documentation (this feature)

```text
specs/001-retail-platform/
├── plan.md              # This file
├── research.md          # Phase 0
├── data-model.md        # Phase 1
├── quickstart.md        # Phase 1
├── contracts/
│   └── api.md           # Phase 1 REST contract
└── tasks.md             # Phase 2 (/speckit.tasks — not created here)
```

### Source Code

```text
galatk-retail/
├── backend/
│   ├── prisma/
│   │   └── schema.prisma
│   ├── src/
│   │   ├── app.ts
│   │   ├── server.ts
│   │   ├── config/
│   │   ├── handlers/
│   │   ├── shared/
│   │   │   ├── middlewares/     # auth, shopScope
│   │   │   └── types/
│   │   └── modules/
│   │       ├── index.ts           # mounts /api/v1
│   │       ├── auth/
│   │       ├── shops/
│   │       ├── products/
│   │       ├── stock/
│   │       ├── pos/
│   │       ├── orders/
│   │       ├── storefront/
│   │       ├── staff/
│   │       └── dashboard/
│   └── tests/                     # Vitest
│
└── front-end/
    └── src/
        ├── assets/main.css        # Tailwind v4
        ├── services/api.ts
        ├── types/
        ├── stores/                # auth, cart, pos
        ├── router/
        ├── layouts/
        │   ├── AdminLayout.vue
        │   ├── PosLayout.vue
        │   └── StorefrontLayout.vue
        ├── views/
        │   ├── admin/             # shops, products, stock, orders, staff
        │   ├── pos/               # register, sales list
        │   ├── storefront/        # catalog, cart, checkout, confirmation
        │   └── auth/LoginView.vue
        └── components/
            ├── admin/
            ├── pos/
            └── ui/
```

**Structure Decision**: Monorepo sibling folders (not nested under single package.json). Backend follows existing boilerplate module pattern (`controller`, `service`, `types`, `presenter`, `constants`, `index`). Frontend replaces Vite starter with persona-based views; constitution rules apply to all UI work.

## Implementation Milestones (MVP)

| Milestone | Stories | Deliverables |
|-----------|---------|--------------|
| **M0 Foundation** | — | Prisma schema (data-model.md), JWT auth, `/api/v1` router, seed OWNER + shop, Vitest setup |
| **M1 Catalog & stock** | US-1, US-4 partial | shops, products, stock modules; inbound transfers; admin UI |
| **M2 POS** | US-2 | pos module; register UI; void rules; sale history |
| **M3 Storefront & orders** | US-3 | storefront public API; cart/checkout; fulfillment status UI |
| **M4 Admin polish** | US-4 | dashboard summary, staff CRUD, order management |
| **M5 Multi-shop ready** | US-5 partial | Second shop via API; scoped queries verified (full network UI can be thin) |

**Explicitly deferred**: User Stories 6–8 (Phase 3 credit/charges) → spec `002-client-credit-charges`.

## Phase 0: Research

Completed — see [research.md](./research.md). All technical unknowns resolved (workshop manual sync, stock transactions, JWT RBAC, shop slug routing, Vitest, payment recording only).

## Phase 1: Design

Completed artifacts:

- [data-model.md](./data-model.md) — Prisma entities, enums, void/checkout transactions, Phase 3 hooks
- [contracts/api.md](./contracts/api.md) — REST surface by module
- [quickstart.md](./quickstart.md) — local dev and smoke flow

**Cross-cutting service rules** (implement in `stock` or shared helper):

1. `decrementShopStock(tx, shopId, lines)` — throws if insufficient (409).
2. `restoreShopStock(tx, shopId, lines)` — on void/cancel.
3. `assertShopAccess(staff, shopId)` — assignment + role.

**Frontend integration**:

- `VITE_API_BASE_URL` → Axios base URL `/api/v1`
- Storefront uses slug from route param; admin/pos uses selected shop from auth context or picker (OWNER)

## Phase 2: Task Breakdown

Not generated by `/speckit.plan`. Run **`/speckit.tasks`** next to produce `tasks.md` from milestones M0–M5.

## Complexity Tracking

> No constitution violations requiring justification.

## Risk & Mitigation

| Risk | Mitigation |
|------|------------|
| Stock oversell under concurrency | Prisma transaction + quantity check; 409 to client |
| Cashier void abuse | Same-day + own-sale rule; manager override audited |
| Workshop/retail drift | Optional `galatkProductRef` / `galatkTransferRef` fields |
| Phase 3 rework | Nullable `Sale.clientId`; documented appendix in data-model |

## References

- Spec: [spec.md](./spec.md)
- Workshop system (separate): galatk MAIN_STOCK — manual handoff only
- Constitution: `backend/.specify/memory/constitution.md`

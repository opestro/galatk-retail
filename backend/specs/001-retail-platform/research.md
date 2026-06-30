# Research: Retail Platform (001-retail-platform)

**Date**: 2026-06-23

## 1. Workshop integration at MVP

**Decision**: Manual-only handoff; no HTTP integration with galatk at MVP.

**Rationale**: Clarified in spec session 2026-06-23. Retail and workshop use separate databases. Managers create retail products with optional `galatkProductRef` string and record inbound receipts with optional `galatkTransferRef`. Workshop staff adjust MAIN_STOCK in galatk independently.

**Alternatives considered**:
- REST sync from galatk → rejected for MVP (blocks retail delivery on workshop API work).
- Shared PostgreSQL schema → rejected (violates split-system architecture).

## 2. Stock concurrency (POS + online)

**Decision**: Single `ShopStock` row per `(shopId, productId)`; all decrements inside Prisma `$transaction` with row-level check (`quantity >= requested`); fail with 409-style business error if insufficient.

**Rationale**: Spec requires decrement at POS complete and online checkout; first commit wins.

**Alternatives considered**:
- Optimistic versioning column → deferred unless contention observed in pilot.
- Separate online pool → rejected (spec: shared pool).

## 3. Authentication & authorization

**Decision**: JWT access tokens for staff; roles `OWNER`, `MANAGER`, `CASHIER` on `StaffUser`; optional `shopIds` scope (all shops for OWNER). Public storefront routes unauthenticated; staff/admin routes require JWT middleware.

**Rationale**: Aligns with galatk interceptor pattern on frontend; simple RBAC matches void rules (cashier vs manager).

**Alternatives considered**:
- Session cookies only → rejected (SPA + separate storefront sub-app fits JWT).
- OAuth / external IdP → deferred.

## 4. Storefront routing (multi-shop ready)

**Decision**: Path-based shop identity: `/shop/:shopSlug` on frontend; public API `/api/v1/storefront/:shopSlug/...`. One deployment serves all shops.

**Rationale**: Spec deferred subdomain decision; slug scales to multi-shop without DNS work at MVP.

**Alternatives considered**:
- Subdomain per shop → deferred to hosting phase.
- Single-shop hardcode → rejected (FR-015).

## 5. Backend module layout

**Decision**: Feature folders under `backend/src/modules/{name}/` each exporting `index.ts` (router), `controller.ts`, `service.ts`, `types.ts`, `presenter.ts`, `constants.ts` — matching existing boilerplate and galatk convention.

**MVP modules**: `auth`, `shops`, `products`, `stock`, `pos`, `orders`, `storefront`, `staff`, `dashboard`.

**Phase 3 placeholders** (schema hooks only at MVP): nullable `clientId` on `Sale`; empty route stubs or README in `clients/`, `credit/`, `charges/` optional.

## 6. Frontend architecture

**Decision**: Vue 3 Composition API + `<script setup>`, Tailwind CSS v4, Pinia, Vue Router, Axios via `src/services/api.ts` with JWT interceptors. Three route groups:
- `/admin/*` — owner/manager (shops, products, stock, orders, staff)
- `/pos/*` — cashier register
- `/shop/:slug/*` — public storefront

**Rationale**: Constitution (`.specify/memory/constitution.md`): Pinia, Axios interceptors, Tailwind v4, no box-shadows, Lucide icons.

**Alternatives considered**:
- Nuxt SSR for SEO → deferred (Vite SPA sufficient for MVP local retail).

## 7. Testing strategy

**Decision**: Add **Vitest** to backend for service-layer unit tests (stock decrement, void rules, checkout). Frontend component tests optional for MVP; manual + Playwright smoke paths in quickstart.

**Rationale**: Boilerplate has no test runner yet; Vitest matches Vite frontend toolchain.

## 8. Payments

**Decision**: Record payment **method enum** (`CASH`, `CARD`) on POS; online orders `PAY_ON_PICKUP` / `COD` — no payment gateway integration at MVP.

**Rationale**: Spec assumptions.

## 9. Delivery validation

**Decision**: Shop stores `serviceCity` string; checkout compares normalized customer city (case-insensitive trim) to shop setting; flat fee from `deliveryFee` decimal on `Shop`.

**Rationale**: Spec clarification: same city + flat fee.

## 10. Phase 3 (credit & charges)

**Decision**: Not implemented in 001; plan reserves Prisma models commented or documented in data-model appendix; follow-on spec `002-client-credit-charges`.

**Rationale**: Explicit spec scope split.

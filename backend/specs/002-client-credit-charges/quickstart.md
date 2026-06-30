# Quickstart: Client Credit, Reminders & Shop Charges

**Branch**: `002-client-credit-charges`  
**Requires**: [001 quickstart](../001-retail-platform/quickstart.md) MVP running

## 1. Migrate schema

```bash
cd galatk-retail/backend
yarn db:migrate:dev
yarn db:generate
# re-run seed if updated with sample clients
yarn dev
```

## 2. Smoke flow — client catalog

1. Login as **MANAGER**.
2. **Admin → Clients** — create client "Ahmed" phone `+212600000001`, credit limit `1000`.
3. Try duplicate phone on second client → expect 400.

## 3. Smoke flow — partial pay at POS

1. Login as **CASHIER**.
2. **POS** — add products, select client Ahmed.
3. Total 200 — pay **100** now → sale completes.
4. **Admin → Client profile** — balance **100**.

## 4. Smoke flow — client payment

1. **POS or Admin → Record payment** — 50 cash.
2. Balance **50** (FIFO from oldest portion).

## 5. Smoke flow — pay-later (manager)

1. Login as **MANAGER**.
2. POS — client Ahmed, **pay later** full 150 → balance **200**.
3. Login as **CASHIER**, attempt pay-later → **403**.

## 6. Smoke flow — reminders

1. Set shop `creditReminderDays` to **0** (or wait / seed old portion).
2. **Admin → Credit reminders** — Ahmed listed.
3. Mark contacted — log appears.

## 7. Smoke flow — shop charge

1. **Admin → Charges** — team food 200.
2. **Dashboard → Financial summary** — charges 200, POS collected separate from client payments.

## 8. Tests

```bash
cd galatk-retail/backend
yarn test
```

Covers: FIFO allocator, credit limit, pay-later RBAC, summary math.

## 9. Key paths

| Area | Frontend | Backend module |
|------|----------|----------------|
| Clients | `/admin/clients` | `clients` |
| Client profile | `/admin/clients/:id` | `clients`, `credit` |
| POS credit | `/pos` (extended) | `pos` |
| Record payment | `/pos/payments` or modal | `credit` |
| Reminders | `/admin/credit/reminders` | `credit` |
| Charges | `/admin/charges` | `charges` |
| Financial summary | `/admin/dashboard` | `dashboard` |

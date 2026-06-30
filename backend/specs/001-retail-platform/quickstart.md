# Quickstart: Retail Platform MVP

**Branch**: `001-retail-platform`

## Prerequisites

- Node.js 22+ (see `front-end/package.json` engines)
- Yarn
- Docker (PostgreSQL for backend)

## 1. Backend

```bash
cd galatk-retail/backend
yarn install
yarn infra:up
```

Create `config/.env.dev`:

```env
PORT=8080
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/galatk_retail
JWT_SECRET=change-me-in-production
JWT_EXPIRES_IN=7d
```

```bash
yarn db:generate
yarn db:migrate:dev
yarn dev
```

Verify: `curl http://localhost:8080/health`

## 2. Frontend

```bash
cd galatk-retail/front-end
yarn install
```

Create `.env`:

```env
VITE_API_BASE_URL=http://localhost:8080/api/v1
```

```bash
yarn dev
```

Open `http://localhost:5173`

## 3. Seed flow (manual MVP smoke)

After migrations + seed script (from tasks):

1. Login as OWNER → create shop slug `main-shop`, set `serviceCity`.
2. Create products with sell prices.
3. POST inbound transfer → verify stock.
4. Open `/pos` → complete cash sale → stock decreases.
5. Open `/shop/main-shop` → guest checkout pickup → order PLACED.
6. Admin → mark order READY → COMPLETED.
7. Cashier void own sale same day → stock restored.
8. Manager cancel unfulfilled order → stock restored.

## 4. Workshop handoff (manual)

1. In **galatk**: release units to MAIN_STOCK (workshop process).
2. In **retail**: manager records inbound transfer with optional `galatkTransferRef`.
3. No API link required at MVP.

## 5. Run tests (after Vitest added in implementation)

```bash
cd galatk-retail/backend
yarn test
```

## 6. Key paths

| App area | Frontend route | Backend module |
|----------|----------------|----------------|
| Admin | `/admin` | shops, products, stock, staff, orders |
| POS | `/pos` | pos |
| Storefront | `/shop/:slug` | storefront |
| Auth | `/login` | auth |

## 7. Environment notes

- CORS: backend `config/cors.ts` must allow frontend origin `http://localhost:5173`.
- Single shop MVP: seed one shop; multi-shop = add shops via OWNER UI.
- Phase 3 (clients, credit, charges): not in this quickstart — see spec Phase 3.

# galatk-retail

Retail platform for Galatk — in-store POS, online shop, client credit, and shop administration.

## Structure

```text
galatk-retail/
├── backend/     # Express + Prisma API (PostgreSQL)
└── front-end/   # Vue 3 + Vite + Tailwind POS & admin UI
```

## Prerequisites

- Node.js 22+
- PostgreSQL (Neon or local)
- Yarn 1.x

## Quick start

### Backend

```bash
cd backend
cp config/.env.example config/.env.dev   # set DATABASE_URL, JWT_SECRET
yarn install
yarn db:migrate:dev
yarn db:seed
yarn dev
```

API: `http://localhost:8080/api/v1`

### Frontend

```bash
cd front-end
cp .env.example .env                    # set VITE_API_BASE_URL
yarn install
yarn dev
```

App: `http://localhost:5173`

## Scripts (from repo root)

```bash
yarn dev:backend    # API with hot reload
yarn dev:frontend   # Vite dev server
yarn test           # Backend Vitest suite
```

## Features

- Multi-shop stock, POS sales, online storefront
- Registered clients, partial pay / pay-later, FIFO debt payments
- Online orders with cashier fulfillment & payment collection
- Shop charges and owner financial summary

## Specs

Feature specs and tasks live under `backend/specs/`.

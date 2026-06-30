# Node Express Boilerplate

Minimal Express + Prisma backend boilerplate with a clean module layout (controllers, services, presenters, types, and constants).

## Prerequisites

- Node.js
- yarn
- Docker (for local database)

## Setup

1) Install dependencies:

```bash
yarn install
```

2) Create a local env file at `config/.env.dev` and add at least:

```
PORT=8080
```

If `DATABASE_URL` is missing and `NODE_ENV=dev`, the app defaults to:
`postgresql://postgres:postgres@localhost:5432/test-postgres`

3) Start local infrastructure:

```bash
yarn infra:up
```

4) Generate Prisma client and run the sample migration:

```bash
yarn db:generate
yarn db:migrate:dev
```

5) Run the server:

```bash
yarn dev
```

## Sample Endpoints

- `GET /examples`
- `GET /examples/:id`
- `POST /examples`

Example body:

```json
{
  "title": "Hello",
  "description": "Sample record"
}
```

## Project Structure

- `src/app.ts` bootstrap and runtime wiring
- `src/server.ts` Express server setup and middleware
- `src/config/` global configuration and CORS
- `src/handlers/` error handling
- `src/resources/` external integrations (database, queues, storage, etc)
- `src/modules/` feature modules
  - Each module includes `index.ts`, `controller.ts`, `service.ts`, `presenter.ts`, `types.ts`, and `constants.ts`
- `scripts/` custom scripts for backend utilities
- `prisma/` schema and migrations

## Notes

- The example module uses the `Example` Prisma model to show end to end flow.
- The error handler uses `CustomError` for typed responses.

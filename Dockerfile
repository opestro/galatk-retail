# --- Stage 1: build Vue frontend ---
FROM node:22-alpine AS frontend-builder

WORKDIR /app

COPY front-end/package.json front-end/yarn.lock ./
RUN yarn install --frozen-lockfile

COPY front-end/ ./

# Same-origin API: axios baseURL /api/v1 hits this container.
ENV VITE_API_BASE_URL=/api/v1
RUN yarn build-only

# --- Stage 2: build Express backend ---
FROM node:22-alpine AS backend-builder

WORKDIR /app

RUN apk update && apk add --no-cache openssl

COPY backend/package.json backend/yarn.lock ./
COPY backend/prisma/schema.prisma prisma/schema.prisma
RUN yarn install --frozen-lockfile

COPY backend/ ./
RUN yarn db:generate
RUN yarn build

# --- Stage 3: production runtime ---
FROM node:22-alpine AS runtime

WORKDIR /app

RUN apk update && apk add --no-cache openssl

COPY backend/package.json backend/yarn.lock ./
COPY backend/prisma ./prisma
# Skip postinstall / prisma CLI (devDependency); copy generated client below
RUN yarn install --frozen-lockfile --production --ignore-scripts

COPY --from=backend-builder /app/dist ./dist
COPY --from=backend-builder /app/node_modules/.prisma ./node_modules/.prisma
COPY --from=backend-builder /app/node_modules/@prisma/client ./node_modules/@prisma/client
COPY --from=frontend-builder /app/dist ./public

ENV NODE_ENV=production
ENV PORT=8080

EXPOSE 8080

CMD ["node", "dist/app.js"]

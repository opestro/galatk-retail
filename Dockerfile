# --- Stage 1: build Vue frontend ---
FROM node:22-alpine AS frontend-builder

WORKDIR /app

COPY front-end/package.json front-end/yarn.lock ./
RUN yarn install --frozen-lockfile

COPY front-end/ ./

# Browser calls the API subdomain (cross-origin). Override at build with:
#   docker build --build-arg VITE_API_BASE_URL=https://api.galatk.shop/api/v1 .
ARG VITE_API_BASE_URL=https://api.galatk.shop/api/v1
ENV VITE_API_BASE_URL=$VITE_API_BASE_URL
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
# PivoCloud maps the EXPOSE'd port; keep PORT in sync (override via platform env if needed).
ENV PORT=8080
ENV WEB_HOST=galatk.shop
ENV API_HOST=api.galatk.shop
ENV FRONTEND_ORIGIN=https://galatk.shop
ENV CORS_ORIGINS=https://galatk.shop,https://www.galatk.shop

EXPOSE 8080

CMD ["node", "dist/app.js"]

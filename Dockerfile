# --- Stage 1: build Vue frontend ---
FROM node:22-bookworm-slim AS frontend-builder

WORKDIR /app

COPY front-end/package.json front-end/yarn.lock ./
RUN yarn install --frozen-lockfile

COPY front-end/ ./

# Browser calls the API subdomain (cross-origin). Override at build with:
#   docker build --build-arg VITE_API_BASE_URL=https://api.galatk.shop/api/v1 .
ARG VITE_API_BASE_URL=https://api.galatk.shop/api/v1
ENV VITE_API_BASE_URL=$VITE_API_BASE_URL
RUN yarn build-only

# --- Stage 2: build Express backend (incl. native modules like bcrypt) ---
FROM node:22-bookworm-slim AS backend-builder

WORKDIR /app

RUN apt-get update && apt-get install -y --no-install-recommends \
    openssl ca-certificates python3 make g++ \
    && rm -rf /var/lib/apt/lists/*

COPY backend/package.json backend/yarn.lock ./
COPY backend/prisma/schema.prisma prisma/schema.prisma
RUN yarn install --frozen-lockfile

COPY backend/ ./
RUN yarn db:generate
RUN yarn build

# Reinstall production deps WITH scripts so bcrypt/prisma engines are present
RUN rm -rf node_modules \
  && yarn install --frozen-lockfile --production \
  && yarn db:generate

# --- Stage 3: production runtime ---
FROM node:22-bookworm-slim AS runtime

WORKDIR /app

RUN apt-get update && apt-get install -y --no-install-recommends \
    openssl ca-certificates \
    && rm -rf /var/lib/apt/lists/*

# Copy app + fully built production node_modules (native addons already compiled)
COPY --from=backend-builder /app/package.json ./package.json
COPY --from=backend-builder /app/prisma ./prisma
COPY --from=backend-builder /app/dist ./dist
COPY --from=backend-builder /app/node_modules ./node_modules
COPY --from=frontend-builder /app/dist ./public

ENV NODE_ENV=production
# Must match EXPOSE and PivoCloud port mapping
ENV PORT=8080
ENV WEB_HOST=galatk.shop
ENV API_HOST=api.galatk.shop
ENV FRONTEND_ORIGIN=https://galatk.shop
ENV CORS_ORIGINS=https://galatk.shop,https://www.galatk.shop

EXPOSE 8080

# Fail loudly in logs if something throws on boot
CMD ["node", "dist/app.js"]

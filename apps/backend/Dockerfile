# HMS backend — production image (multi-stage).
#
# npm workspaces monorepo bo'lgani uchun BUILD CONTEXT repo ILDIZI
# bo'lishi kerak:
#   docker build -f apps/backend/Dockerfile -t hms-backend .
# (docker-compose.prod.yml buni avtomatik to'g'ri qiladi.)

FROM node:20-alpine AS base
WORKDIR /app
COPY package.json package-lock.json ./
COPY apps/backend/package.json apps/backend/package.json
COPY apps/frontend/package.json apps/frontend/package.json

# --- Barcha bog'liqliklar (dev + prod) — build va prisma generate uchun ---
FROM base AS deps
RUN npm ci

# --- Kompilyatsiya ---
FROM deps AS build
COPY apps/backend apps/backend
RUN npx prisma generate --schema=apps/backend/prisma/schema.prisma \
 && npm run build --workspace=apps/backend

# --- Faqat backend uchun production bog'liqliklari ---
FROM base AS prod-deps
RUN npm ci --omit=dev --workspace=apps/backend

# --- Yakuniy, yengil runtime image ---
FROM node:20-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
RUN addgroup -S hms && adduser -S hms -G hms

COPY --from=prod-deps /app/node_modules ./node_modules
COPY --from=build /app/node_modules/.prisma ./node_modules/.prisma
COPY --from=build /app/apps/backend/dist ./apps/backend/dist
COPY --from=build /app/apps/backend/prisma ./apps/backend/prisma
COPY apps/backend/package.json ./apps/backend/package.json
COPY apps/backend/docker-entrypoint.sh ./apps/backend/docker-entrypoint.sh

RUN chmod +x ./apps/backend/docker-entrypoint.sh && chown -R hms:hms /app

USER hms
WORKDIR /app/apps/backend
EXPOSE 3001

ENTRYPOINT ["./docker-entrypoint.sh"]

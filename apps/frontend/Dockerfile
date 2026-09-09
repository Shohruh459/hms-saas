# HMS frontend — production image (multi-stage, Next.js standalone output).
#
# npm workspaces monorepo bo'lgani uchun BUILD CONTEXT repo ILDIZI
# bo'lishi kerak:
#   docker build -f apps/frontend/Dockerfile -t hms-frontend .
# (docker-compose.prod.yml buni avtomatik to'g'ri qiladi.)
#
# NEXT_PUBLIC_* o'zgaruvchilari Next.js'da BUILD vaqtida brauzer
# bundle'iga yoziladi — shu sababli ular runtime env emas, build ARG
# sifatida beriladi.

FROM node:20-alpine AS base
WORKDIR /app
COPY package.json package-lock.json ./
COPY apps/backend/package.json apps/backend/package.json
COPY apps/frontend/package.json apps/frontend/package.json

FROM base AS deps
RUN npm ci

FROM deps AS build
COPY apps/frontend apps/frontend

ARG NEXT_PUBLIC_API_URL=/api
ARG NEXT_PUBLIC_SOCKET_URL=
ARG NEXT_PUBLIC_TENANT_ID=
ARG NEXT_PUBLIC_ROOT_DOMAIN=
ENV NEXT_PUBLIC_API_URL=${NEXT_PUBLIC_API_URL}
ENV NEXT_PUBLIC_SOCKET_URL=${NEXT_PUBLIC_SOCKET_URL}
ENV NEXT_PUBLIC_TENANT_ID=${NEXT_PUBLIC_TENANT_ID}
ENV NEXT_PUBLIC_ROOT_DOMAIN=${NEXT_PUBLIC_ROOT_DOMAIN}

RUN npm run build --workspace=apps/frontend

FROM node:20-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV PORT=3000
RUN addgroup -S hms && adduser -S hms -G hms

# Next.js standalone output — monorepo tarkibidagi joylashuvni saqlagan
# holda o'zining minimal node_modules'ini o'z ichiga oladi.
COPY --from=build --chown=hms:hms /app/apps/frontend/.next/standalone ./
COPY --from=build --chown=hms:hms /app/apps/frontend/.next/static ./apps/frontend/.next/static
COPY --from=build --chown=hms:hms /app/apps/frontend/public ./apps/frontend/public

USER hms
EXPOSE 3000
CMD ["node", "apps/frontend/server.js"]

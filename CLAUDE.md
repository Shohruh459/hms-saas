# CLAUDE.md

Bu fayl Claude Code (va boshqa AI agentlar) uchun **HMS SaaS** loyihasi bo'yicha yo'riqnoma hisoblanadi.

## Loyiha haqida

**HMS (Hotel Management System)** — mehmonxonalar uchun multi-tenant SaaS platforma. Har bir mehmonxona (tenant) o'z subdomeni/hisobi ostida ishlaydi. Batafsil arxitektura va biznes-oqimlar uchun [`PROJECT_PLAN.md`](./PROJECT_PLAN.md) ga qarang.

## Tech stack

| Qatlam | Texnologiya |
|---|---|
| Backend | NestJS (TypeScript) |
| Frontend | Next.js (App Router, TypeScript) |
| Ma'lumotlar bazasi | PostgreSQL |
| ORM | Prisma |
| Cache / Queue broker | Redis |
| Navbatlar (jobs) | BullMQ |
| Konteynerizatsiya | Docker, docker-compose |
| Reverse proxy | Nginx |
| Server | Hetzner (VPS) |
| To'lovlar | Click, Payme, Stripe |

## Monorepo struktura

```
hms-saas/
├── apps/
│   ├── backend/     # NestJS API (apps/backend)
│   └── frontend/    # Next.js ilova — mehmon.uz va mehmon.uz/admin
├── docker-compose.yml
├── PROJECT_PLAN.md
└── CLAUDE.md
```

Ishchi fazolar (workspaces) npm workspaces orqali boshqariladi — root `package.json` ga qarang.

## Ishga tushirish

### 1. Muhit fayllari

```bash
cp apps/backend/.env.example apps/backend/.env
cp apps/frontend/.env.example apps/frontend/.env
```

### 2. Infratuzilmani ko'tarish (Postgres, Redis, Adminer)

```bash
docker-compose up -d
```

### 3. Bog'liqliklarni o'rnatish

```bash
npm install
```

### 4. Prisma migratsiyalari (backend)

```bash
npm run prisma:generate --workspace=apps/backend
npm run prisma:migrate --workspace=apps/backend
```

### 5. Dasturlarni ishga tushirish (dev rejim)

```bash
npm run dev:backend     # http://localhost:3001
npm run dev:frontend    # http://localhost:3000
```

## Root package.json script'lari

| Script | Vazifasi |
|---|---|
| `npm run dev:backend` | NestJS backend'ni watch rejimida ishga tushiradi |
| `npm run dev:frontend` | Next.js frontend'ni dev serverda ishga tushiradi |
| `npm run build` | Barcha workspace'larni build qiladi |
| `npm run lint` | Barcha workspace'larda linter ishlatadi |
| `npm run test` | Barcha workspace'larda testlarni ishga tushiradi |

## Docker buyruqlari

```bash
docker-compose up -d          # Postgres, Redis, Adminer'ni fon rejimida ishga tushirish
docker-compose down           # Xizmatlarni to'xtatish (volume'lar saqlanadi)
docker-compose down -v        # Xizmatlarni to'xtatish va volume'larni ham o'chirish
docker-compose logs -f        # Loglarni real vaqtda kuzatish
docker-compose ps             # Ishlayotgan xizmatlar holati
```

Adminer (DB UI): http://localhost:8080 — Server: `postgres`, User/Password: `.env` dagi qiymatlar.

## Kodlash standartlari

- **TypeScript strict rejim** — barcha paketlarda `strict: true`.
- **ESLint + Prettier** — commit qilishdan oldin `npm run lint` xato bermasligi kerak.
- **Nomlash**: fayllar `kebab-case`, klasslar `PascalCase`, o'zgaruvchi/funksiyalar `camelCase`.
- **NestJS modullari** — har bir domain (masalan `service-requests`, `tenants`, `payments`) alohida modul sifatida ajratiladi: `module`, `controller`, `service`, `dto`.
- **Prisma** — barcha sxema o'zgarishlari migratsiya orqali kiritiladi, to'g'ridan-to'g'ri bazada qo'lda o'zgartirish taqiqlanadi.
- **API javoblari** — bir xil formatda (`{ data, error }` yoki NestJS exception filter orqali).
- **i18n** — matnlar hardcode qilinmaydi, `uz`/`ru`/`en` tarjima kalitlari orqali chiqariladi.
- **Commit xabarlari** — [Conventional Commits](https://www.conventionalcommits.org/) formatida (`feat:`, `fix:`, `chore:`, ...).
- **Sirlar** — `.env` fayllar hech qachon commit qilinmaydi, faqat `.env.example` repo'da saqlanadi.

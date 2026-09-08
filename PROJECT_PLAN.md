# HMS SaaS — Loyiha Rejasi

## 1. Umumiy g'oya

**HMS (Hotel Management System)** — mehmonxonalar uchun multi-tenant SaaS platforma. Har bir mehmonxona (tenant) tizimga ro'yxatdan o'tadi va o'z xonalari, xodimlari, mehmonlari va so'rovlarini boshqaradi. Bitta kod bazasi barcha tenantlarga xizmat qiladi (shared infrastructure, tenant-scoped data).

## 2. Arxitektura

### 2.1 Infratuzilma

```
                         ┌────────────────────┐
                         │   Hetzner VPS       │
                         │                      │
   Internet ───443───▶  │  ┌────────────┐      │
                         │  │   Nginx     │      │
                         │  │ (reverse    │      │
                         │  │  proxy +    │      │
                         │  │  SSL)       │      │
                         │  └─────┬──────┘      │
                         │        │              │
                         │  ┌─────┴──────┐       │
                         │  │  Docker    │       │
                         │  │  Compose   │       │
                         │  ├────────────┤       │
                         │  │ frontend   │(3000) │
                         │  │ backend    │(3001) │
                         │  │ postgres   │(5432) │
                         │  │ redis      │(6379) │
                         │  │ adminer    │(8080) │
                         │  └────────────┘       │
                         └────────────────────┘
```

- **Hetzner** — asosiy production server (VPS).
- **Docker / docker-compose** — barcha xizmatlar konteynerlarda ishlaydi, deploy jarayoni bir xillashtiriladi.
- **Nginx** — tashqi trafikni qabul qiladi, SSL terminatsiya, `mehmon.uz` va `mehmon.uz/admin` route'larini frontend/backend'ga yo'naltiradi.
- **PostgreSQL** — asosiy relyatsion ma'lumotlar bazasi, tenant-scoped jadvallar (`tenantId` ustuni orqali ajratiladi).
- **Redis** — sessiya/cache, real-vaqt bildirishnomalar (pub/sub) va BullMQ uchun broker.
- **BullMQ** — asinxron ishlar navbati: bildirishnomalar (push/SMS/telegram), to'lov webhook qayta ishlash, hisobotlar generatsiyasi.

### 2.2 Multi-tenancy modeli

- **Bitta baza, tenant ustuni** yondashuvi: har bir asosiy jadvalda (`User`, `Room`, `ServiceRequest`, `Payment` va h.k.) `tenantId` maydoni bo'ladi.
- Har bir so'rov (request) NestJS `TenantMiddleware`/`Guard` orqali subdomen yoki JWT'dagi `tenantId` asosida aniqlanadi.
- Kelajakda katta tenantlar uchun schema-per-tenant yoki database-per-tenant strategiyasiga o'tish imkoniyati arxitekturada hisobga olinadi (Prisma `tenantId` filtri orqali abstraksiya qilingan xolda).

### 2.3 Ko'p tillilik (i18n)

- Qo'llab-quvvatlanadigan tillar: **uz** (default), **ru**, **en**.
- Frontend: Next.js App Router'da `app/[locale]/...` segmentlash, tarjima kalitlari JSON fayllarda (`messages/uz.json`, `messages/ru.json`, `messages/en.json`).
- Backend: xato xabarlari va bildirishnoma matnlari uchun i18n kalitlar, foydalanuvchi tilini `Accept-Language` yoki profil sozlamasidan oladi.
- Har bir tenant o'zining standart tilini sozlashi mumkin (masalan, chet el mehmonlari ko'p bo'lgan mehmonxona uchun `en`).

### 2.4 Onlayn yordam va shikoyatlar paneli

- Mehmon ilovasida "Yordam / Shikoyat" bo'limi — matnli murojaat + ixtiyoriy rasm biriktirish.
- Har bir murojaat `SupportTicket` sifatida saqlanadi: `status` (`OPEN`, `IN_PROGRESS`, `RESOLVED`, `CLOSED`), `priority`, `category`.
- Admin panelda real-vaqt ro'yxat (WebSocket/Redis pub-sub orqali yangilanadi) va javob yozish imkoniyati.
- SLA kuzatuvi: belgilangan vaqt ichida javob berilmagan tiketlar admin uchun ajratib ko'rsatiladi.

### 2.5 Xona xizmatchisini chaqirish oqimi

Asosiy biznes-jarayon — mehmon xonadan xizmatchi chaqirishi:

```
  Mehmon                    Admin                      Xizmatchi
    │                         │                             │
    │  1. So'rov yaratadi     │                             │
    │  (sababini yozadi:      │                             │
    │  "sochiq kerak" va h.k.)│                             │
    ├────────────────────────▶│                             │
    │   status: PENDING       │                             │
    │                         │  2. Ko'rib chiqadi va        │
    │                         │  tegishli xizmatchiga        │
    │                         │  tayinlaydi                  │
    │                         ├────────────────────────────▶│
    │                         │   status: APPROVED           │
    │                         │                             │
    │                         │                       3. Bajaradi va
    │                         │                       holatni belgilaydi:
    │                         │                       "Bajarildi" yoki
    │                         │                       "Bajara olmadim"
    │                         │◀────────────────────────────┤
    │                         │  status: DONE / FAILED       │
    │◀────────────────────────┤ (push bildirishnoma)        │
    │  Natija haqida xabar    │                             │
```

**Holat mashinasi (state machine):**

`PENDING` → `APPROVED` → `DONE` | `FAILED`

- **PENDING** — mehmon so'rov yaratdi, admin tasdig'ini kutmoqda.
- **APPROVED** — admin tasdiqladi va xizmatchiga tayinladi.
- **DONE** — xizmatchi vazifani bajardi.
- **FAILED** — xizmatchi bajara olmadi (sabab bilan birga).

Har bir holat o'zgarishi `ServiceRequestHistory` jadvalida audit sifatida saqlanadi va BullMQ orqali tegishli tomonga bildirishnoma yuboriladi.

### 2.6 To'lov integratsiyasi arxitekturasi

Uch to'lov provayderi qo'llab-quvvatlanadi: **Click**, **Payme** (O'zbekiston bozori uchun) va **Stripe** (xalqaro kartalar uchun).

```
  Frontend (checkout) ──▶ Backend: POST /payments/create
                                │
                                ▼
                      PaymentProvider Strategy
                    ┌──────────┬──────────┬──────────┐
                    │  Click   │  Payme   │  Stripe  │
                    │ Adapter  │ Adapter  │ Adapter  │
                    └────┬─────┴────┬─────┴────┬─────┘
                         │          │           │
                         ▼          ▼           ▼
                    Click API   Payme API   Stripe API
                         │          │           │
                         ▼          ▼           ▼
                  Webhook: POST /payments/webhook/{provider}
                                │
                                ▼
                       BullMQ job: to'lov holatini
                       yangilash + tenant balansini
                       hisoblash + bildirishnoma
```

- Har bir provayder uchun alohida **Adapter** (Strategy pattern) — umumiy `PaymentProvider` interfeysini implementatsiya qiladi (`createPayment`, `verifyWebhook`, `getStatus`).
- Webhook'lar imzo tekshiruvidan (signature verification) o'tadi, so'ng BullMQ navbatiga qo'yiladi — bu tashqi API'ning sekinligi asosiy so'rovni bloklamasligini ta'minlaydi.
- To'lov holatlari: `PENDING`, `PAID`, `FAILED`, `REFUNDED`.
- Barcha tranzaksiyalar `Payment` jadvalida `tenantId`, `provider`, `providerTransactionId`, `amount`, `currency`, `status` maydonlari bilan saqlanadi.

## 3. Ilovalar strukturasi

```
hms-saas/
├── apps/
│   ├── backend/                # NestJS API
│   │   ├── src/
│   │   │   ├── modules/         # tenants, service-requests, support, payments, auth ...
│   │   │   ├── app.module.ts
│   │   │   └── main.ts
│   │   └── prisma/schema.prisma
│   │
│   └── frontend/                # Next.js (App Router)
│       └── src/app/
│           └── [locale]/
│               ├── page.tsx         # Mehmon ilovasi — mehmon.uz
│               └── admin/page.tsx   # Admin/Xodimlar paneli — mehmon.uz/admin
│
├── docker-compose.yml
├── CLAUDE.md
└── PROJECT_PLAN.md
```

- **mehmon.uz** — mehmonlar uchun ochiq ilova: xizmatchi chaqirish, yordam/shikoyat, to'lov.
- **mehmon.uz/admin** — admin va xodimlar uchun boshqaruv paneli: so'rovlarni tasdiqlash, xizmatchilarga tayinlash, tiketlarni boshqarish, hisobotlar, to'lovlar monitoringi. Rol asosida (Admin / Xizmatchi) UI va ruxsatlar farqlanadi.

## 4. Keyingi bosqichlar (roadmap)

1. Auth va rol tizimi (Guest/Admin/Staff, JWT + tenant context).
2. Xona xizmatchisini chaqirish moduli (to'liq CRUD + holat mashinasi + real-vaqt bildirishnomalar).
3. Onlayn yordam/shikoyat moduli.
4. To'lov adapterlari (Click → Payme → Stripe navbat bilan).
5. Admin panel dashboard va hisobotlar.
6. Production deploy: Hetzner + Nginx + SSL (Let's Encrypt) + CI/CD.

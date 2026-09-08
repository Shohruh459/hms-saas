# HMS SaaS — Deploy qo'llanmasi

Bu qo'llanma server sotib olingach va domen aniqlangach, HMS SaaS'ni
Hetzner (yoki boshqa Ubuntu VPS) serverga Docker + Nginx + SSL bilan
production rejimda ishga tushirish bosqichlarini tasvirlaydi.

Hozircha server/domen yo'q bo'lsa ham, 1—4-bosqichlarni **lokal
Docker muhitida** `DOMAIN_NAME=localhost` bilan sinab ko'rishingiz
mumkin — barcha konfiguratsiya shu maqsadda dinamik (`.env.production`
orqali) qilingan.

## 0. Talablar

- Ubuntu 22.04+ server (Hetzner CX-turkumi va h.k.)
- Domen nomi (DNS A-yozuvi server IP'siga yo'naltirilgan) — SSL bosqichi uchun
- SSH orqali root/sudo kirish

## 1. Serverni tayyorlash

```bash
ssh root@SERVER_IP

apt update && apt upgrade -y

# Docker Engine + Compose plugin
curl -fsSL https://get.docker.com | sh
apt install -y docker-compose-plugin

# Firewall
ufw allow OpenSSH
ufw allow 80/tcp
ufw allow 443/tcp
ufw enable
```

> Eslatma: Nginx alohida paket sifatida o'rnatilmaydi — u
> `docker-compose.prod.yml` ichida konteyner sifatida ishlaydi, shuning
> uchun serverda faqat Docker kifoya.

## 2. Loyihani serverga joylash

```bash
mkdir -p /opt/hms-saas && cd /opt/hms-saas
git clone https://github.com/<owner>/hms-saas.git .
# yoki mavjud bo'lsa: git pull origin main
```

## 3. `.env.production` faylini sozlash

```bash
cp .env.production.example .env.production
nano .env.production
```

To'ldirilishi kerak bo'lgan asosiy qiymatlar:

| O'zgaruvchi | Tavsif |
|---|---|
| `DOMAIN_NAME` | Domen aniq bo'lgach — masalan `mehmon.uz`. Hozircha `localhost` qoldiring. |
| `POSTGRES_PASSWORD` | Kuchli, tasodifiy parol |
| `JWT_SECRET` | Uzun, tasodifiy maxfiy satr (`openssl rand -hex 32`) |
| `NEXT_PUBLIC_API_URL` | Odatda `/api` bo'lib qoladi — Nginx uni backend'ga proxy qiladi, domen o'zgarganda qayta build shart emas |
| `CERTBOT_EMAIL` | SSL sertifikati bildirishnomalari uchun email |

## 4. Birinchi marta ishga tushirish (SSL'siz, HTTP)

```bash
docker compose --env-file .env.production -f docker-compose.prod.yml up -d --build
```

Tekshirish:

```bash
curl http://localhost/api/health
curl http://localhost/           # Next.js frontend
```

Bu bosqichda sayt `http://DOMAIN_NAME` (yoki `http://SERVER_IP`) orqali
ishlaydi — hali SSL yo'q. Agar `DOMAIN_NAME=localhost` bo'lsa, bu xuddi
shu buyruqlar bilan **to'liq lokal muhitda** ham ishlaydi.

## 5. Ma'lumotlar bazasi migratsiyasi

Backend konteyneri ishga tushganda `docker-entrypoint.sh` avtomatik
`prisma migrate deploy` ni bajaradi — qo'lda ishga tushirish shart
emas. Zarur bo'lsa, qo'lda qayta ishlatish:

```bash
docker compose --env-file .env.production -f docker-compose.prod.yml \
  exec backend npx prisma migrate deploy
```

## 6. SSL sertifikatini olish (domen aniqlangach)

DNS A-yozuvi `DOMAIN_NAME` ni server IP'siga ko'rsatganiga ishonch
hosil qiling, so'ng:

```bash
docker compose --env-file .env.production -f docker-compose.prod.yml \
  run --rm certbot certonly --webroot -w /var/www/certbot \
  -d ${DOMAIN_NAME} --email ${CERTBOT_EMAIL} --agree-tos --no-eff-email
```

Sertifikat muvaffaqiyatli olingach, HTTPS konfiguratsiyasini
faollashtiring:

```bash
mv nginx/conf.d/default.conf.template nginx/conf.d/default.conf.template.bak
cp nginx/conf.d/ssl.conf.template.example nginx/conf.d/default.conf.template
docker compose --env-file .env.production -f docker-compose.prod.yml restart nginx
```

Endi sayt `https://DOMAIN_NAME` orqali ishlaydi, `http://` so'rovlar
avtomatik HTTPS'ga yo'naltiriladi.

### Sertifikatni avtomatik yangilash

Let's Encrypt sertifikatlari 90 kunlik. Cron orqali avtomatik yangilash:

```bash
crontab -e
# quyidagi qatorni qo'shing:
0 3 * * * cd /opt/hms-saas && docker compose --env-file .env.production -f docker-compose.prod.yml run --rm certbot renew && docker compose --env-file .env.production -f docker-compose.prod.yml restart nginx
```

## 7. GitHub Actions orqali avtomatik deploy (CI/CD)

`.github/workflows/deploy.yml` har bir `main`ga push'da:
1. **Test bosqichi** — har doim ishlaydi: backend unit/e2e testlari (real Postgres/Redis service konteynerlari bilan) va backend+frontend build tekshiruvi.
2. **Deploy bosqichi** — faqat quyidagi GitHub Secrets qo'shilgandan keyin avtomatik yoqiladi (aks holda jimgina o'tkazib yuboriladi):

Repozitoriyada **Settings → Secrets and variables → Actions** bo'limiga qo'shing:

| Secret | Tavsif |
|---|---|
| `SSH_HOST` | Server IP yoki domen |
| `SSH_USER` | SSH foydalanuvchisi (masalan `root` yoki `deploy`) |
| `SSH_KEY` | SSH private key (parolsiz, PEM format) |
| `DEPLOY_PATH` | (ixtiyoriy) Serverdagi loyiha yo'li, standart: `/opt/hms-saas` |

Bu Secrets qo'shilgandan so'ng, keyingi `main`ga push avtomatik serverга
`git pull` + `docker compose build` + `docker compose up -d` bajaradi.

## 8. Foydali buyruqlar

```bash
# Loglarni kuzatish
docker compose --env-file .env.production -f docker-compose.prod.yml logs -f backend
docker compose --env-file .env.production -f docker-compose.prod.yml logs -f frontend

# Xizmatlar holati
docker compose --env-file .env.production -f docker-compose.prod.yml ps

# To'xtatish
docker compose --env-file .env.production -f docker-compose.prod.yml down

# Yangilash (qo'lda, CI/CD sozlanmagan bo'lsa)
git pull origin main
docker compose --env-file .env.production -f docker-compose.prod.yml up -d --build
```

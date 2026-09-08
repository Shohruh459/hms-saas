# HMS — Mobil ilovalar rejasi (PWA + Capacitor)

Bu hujjat HMS'ning veb-ilovasidan ikkita alohida mobil ilova (APK)
yaratish rejasini va amaliy yo'riqnomasini tasvirlaydi:

1. **Mehmonlar APK** — `mehmon.uz` (asosiy sahifa, bron, xizmatchi chaqirish, yordam).
2. **Admin/Xodimlar APK** — `mehmon.uz/admin` (xonalar matritsasi, so'rovlar, vazifalar).

Ikkalasi ham bitta Next.js kod bazasidan (`apps/frontend`) ishlaydi —
alohida mobil kod bazasi yozilmaydi. Yondashuv ikki bosqichli:

- **Hozir (server/domen bo'lmasa ham ishlaydi):** PWA (Progressive Web App) —
  brauzerdan "Bosh ekranga qo'shish" orqali o'rnatiladigan ilova.
- **Kelajakda (domen aniqlangach):** Capacitor — PWA'ni haqiqiy `.apk`/`.ipa`
  faylga o'raydi, Play Store/App Store'ga chiqarish imkonini beradi.

## 1. Hozirgi holat — PWA (bajarilgan)

`apps/frontend`ga quyidagilar allaqachon qo'shilgan:

- `public/manifest.json` — ilova nomi, ikonkalar, `display: standalone`, `theme_color`.
- `public/sw.js` — statik fayllarni keshlaydigan minimal Service Worker (real-vaqt
  ma'lumotlar — xonalar, so'rovlar — har doim tarmoqdan olinadi, eskirgan holat
  ko'rsatilmaydi).
- `public/icons/icon.svg` (+ 192px/512px PNG variantlari) — ilova ikonkasi.
- `src/app/layout.tsx` — `manifest`, `themeColor`, `appleWebApp` meta-ma'lumotlari
  va Service Worker'ni ro'yxatdan o'tkazuvchi komponent.

**Sinash:** `npm run build && npm run start` so'ng brauzerda saytni ochib,
manzil satridagi "O'rnatish" (Install) belgisini bosish, yoki mobil Chrome'da
"Bosh ekranga qo'shish" menyusidan foydalanish kifoya — domen/server talab
qilinmaydi, `localhost`'da ham ishlaydi.

### Admin uchun alohida manifest (keyingi qadam)

Hozircha bitta umumiy `manifest.json` butun sayt uchun ishlatiladi. Kelajakda
`/admin` uchun alohida nom/ikonka bilan PWA kerak bo'lsa:

1. `app/[locale]/admin/`ga server component `layout.tsx` (hozirgi client
   layout'ni ichkariga o'rab, tashqarisiga server wrapper qo'shish) orqali
   `export const metadata = { manifest: '/admin-manifest.json', ... }`
   qo'shiladi (Next.js App Router'da `metadata` faqat server component'dan
   eksport qilinadi).
2. `public/admin-manifest.json` — xuddi shu shaklda, lekin `name: "HMS Admin"`,
   `start_url: "/admin"`.

## 2. Capacitor bilan APK yaratish rejasi

[Capacitor](https://capacitorjs.com) veb-ilovani "hosted web app" rejimida
ishlatadi — APK ichida statik fayllar emas, balki `server.url` orqali haqiqiy
deploy qilingan domenga ishora qiladi. Bu HMS uchun to'g'ri yondashuv, chunki
ilova real-vaqt WebSocket ulanishi va doimiy backend'ga muhtoj.

**Talab:** Domen va SSL sertifikati tayyor bo'lishi kerak (DEPLOYMENT.md,
6-bosqich) — Capacitor `server.url` uchun `https://` manzil talab qiladi.

### 2.1 Ikkita alohida Capacitor loyihasi

Bitta Next.js kod bazasidan ikkita mustaqil Capacitor "qobiq" (shell)
loyihasi yaratiladi — har biri o'z `start_url`, nomi, ikonkasi va
`applicationId`'ga ega:

```
mobile/
├── guest-app/       # Mehmonlar APK
│   ├── capacitor.config.ts
│   └── android/ (npx cap add android orqali generatsiya qilinadi)
└── admin-app/       # Admin/Xodimlar APK
    ├── capacitor.config.ts
    └── android/
```

### 2.2 O'rnatish buyruqlari

```bash
mkdir -p mobile/guest-app && cd mobile/guest-app
npm init -y
npm install @capacitor/core @capacitor/cli @capacitor/android @capacitor/push-notifications
npx cap init "HMS Mehmon" "uz.mehmon.guest" --web-dir=www
```

`capacitor.config.ts` (Mehmonlar APK):

```ts
import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'uz.mehmon.guest',
  appName: 'HMS Mehmon',
  webDir: 'www', // bo'sh, chunki server.url ishlatiladi
  server: {
    url: 'https://mehmon.uz',
    cleartext: false,
  },
  android: {
    allowMixedContent: false,
  },
};

export default config;
```

Admin APK uchun bir xil, farqi:

```ts
const config: CapacitorConfig = {
  appId: 'uz.mehmon.admin',
  appName: 'HMS Admin',
  webDir: 'www',
  server: {
    url: 'https://mehmon.uz/admin',
    cleartext: false,
  },
};
```

Android loyihasini yaratish va build qilish:

```bash
mkdir www && touch www/.gitkeep   # webDir bo'sh bo'lsa ham papka kerak
npx cap add android
npx cap sync android
npx cap open android              # Android Studio'da ochiladi, undan APK/AAB yig'iladi
```

### 2.3 Push-bildirishnomalar

Ilova allaqachon Socket.IO orqali real-vaqt bildirishnoma beradi (ilova ochiq
bo'lganda). APK yopiq holatda ham bildirishnoma olishi uchun:

- `@capacitor/push-notifications` plagini + Firebase Cloud Messaging (FCM)
  sozlanadi (Android uchun `google-services.json` kerak).
- Backend'da `NotificationsService`ga FCM token saqlash va yuborish qo'shiladi
  (kelajakdagi qo'shimcha modul — PROJECT_PLAN.md 5-bo'limiga qarang).

### 2.4 Ikonka, splash screen va do'kon uchun tayyorgarlik

- `@capacitor/assets` paketi orqali `public/icons/icon.svg`'dan barcha zarur
  o'lchamdagi ikonka/splash screen fayllari avtomatik generatsiya qilinadi:
  ```bash
  npx @capacitor/assets generate --iconBackgroundColor '#2563eb' --splashBackgroundColor '#ffffff'
  ```
- Play Store uchun: ilova tavsifi, skrinshotlar, maxfiylik siyosati sahifasi
  (`/privacy` route'i frontend'ga qo'shiladi) tayyorlanadi.

### 2.5 Ishlab chiqish tartibi (checklist)

1. ✅ PWA manifest/Service Worker (hozir bajarilgan).
2. ⏭ Domen va SSL faollashtirilgach — `capacitor.config.ts`'da haqiqiy domenni ko'rsatish.
3. ⏭ `mobile/guest-app` va `mobile/admin-app` Capacitor loyihalarini yaratish.
4. ⏭ Push-bildirishnoma (FCM) integratsiyasi.
5. ⏭ Ikonka/splash screen generatsiyasi va ichki test (internal testing track).
6. ⏭ Play Store/App Store'ga chiqarish.

# iPhone Shop Telegram Bot + Mini App

Do'kon adminlari uchun: Telegram botda **Mini App** ochiladi, post yaratiladi (avtomatik to'lov hisob-kitobi bilan), kanalga rasm + matn jo'natiladi.

## Imkoniyatlar

- 📝 Mini App orqali post yaratish (avto-to'ldirish: matnni qo'ysangiz, maydonlarni o'zi to'ldiradi)
- 🍎/🤖 Apple yoki Android tanlash
- 📷 1 ta majburiy + 5 ta ixtiyoriy rasm (jami 6 ta)
- 💰 Avtomatik to'lov rejasi: Bosh to'lov, 3/6/9/12 oy
- ⚙️ Foizlar va min. bosh to'lov sozlamalari (Mini Appdan)
- 👥 Admin qo'shish/o'chirish (faqat egasi)
- ✅ "Bot ishlayaptimi?" — kanalga sinov xabari yuborish
- 🔒 Telegram WebApp `initData` orqali ishonchli autentifikatsiya

## 1) Bot va kanal

1. [@BotFather](https://t.me/BotFather) da bot yarating, **token** oling.
2. Telegram kanal yarating, botingizni unga **administrator** qilib qo'shing (post jo'natish huquqi bilan).
3. Kanal ID ni oling (kanaldan biror xabar [@userinfobot](https://t.me/userinfobot) ga forward qiling — `-100…` bilan boshlanadi).
4. O'zingizning Telegram ID raqamingizni [@getmyid_bot](https://t.me/getmyid_bot) dan oling.

## 2) O'rnatish

```bash
cd shabloner
npm install
cp .env.example .env
```

`.env` faylini to'ldiring:

```
BOT_TOKEN=8698075259:AAGfb...     # BotFather dan
CHANNEL_ID=-1001234567890         # Kanal ID
WEB_APP_URL=https://your.domain   # HTTPS, Mini App URL
OWNER_ID=123456789                # Sizning Telegram ID
PORT=3000
```

> **WEB_APP_URL** majburiy ravishda **HTTPS** bo'lishi kerak (Telegram talabi). Lokal sinov uchun `ngrok` yoki `cloudflared` tunnelidan foydalaning.

## 3) Lokal ishga tushirish (ngrok bilan)

```bash
# Terminal 1
npm start

# Terminal 2 (ngrok o'rnatilgan bo'lsin)
ngrok http 3000
```

ngrok bergan `https://xxxx.ngrok-free.app` ni `.env` dagi `WEB_APP_URL` ga qo'ying va serverni qayta ishga tushiring.

## 4) Mini App URL ni BotFather ga ulash

BotFather da `/mybots` → botingiz → **Bot Settings** → **Menu Button** → URL ni qo'ying:
```
https://your.domain
```

Endi botda chap-pastdagi **Menu** tugmasi bosilsa, Mini App ochiladi.

## 5) Foydalanish

1. Botga `/start` yuboring → menyu chiqadi.
2. **📝 Yangi post yaratish** → forma to'ldiring → **🚀 Kanalga yuborish**.
3. Yangi admin qo'shish: **👥 Adminlar** tabida ID kiriting (yoki bot ichida `/addadmin <id>`).
4. To'lov foizlari: **⚙️ Sozlamalar** tabidan o'zgartiring.
5. Bot tirikligini tekshirish: menyudan **✅ Bot ishlayaptimi?** — kanalga `✅ Bot ishlayapti.` xabari yuboriladi.

## To'lov formulasi

```
bosh_tolov = max(narx × initial_percent / 100, min_initial)
oylik_X    = ⌈(narx − bosh_tolov) × (1 + monthly_markup × X / 100) / X⌉
```

Standart qiymatlar (Sozlamalar tabidan o'zgartiriladi):
- `initial_percent = 30` (bosh to'lov foizi)
- `monthly_markup = 5` (oylik ustama foizi)
- `min_initial = 0`

**Misol:** 900$ telefon, 30% bosh, 5% oylik:
- Bosh: 270$, financed: 630$
- 3 oy: ⌈630 × 1.15 / 3⌉ = 242$/oy
- 6 oy: ⌈630 × 1.30 / 6⌉ = 137$/oy
- 9 oy: ⌈630 × 1.45 / 9⌉ = 102$/oy
- 12 oy: ⌈630 × 1.60 / 12⌉ = 84$/oy

## 🚂 Railway'ga deploy qilish (eng oson yo'l)

### Qadam 1 — Railway hisob ochish
1. [railway.com](https://railway.com) → **Login with GitHub** (oson)
2. Tasdiqlovchi xat / SMS bo'lmaydi, GitHub orqali avtomatik

### Qadam 2 — Loyihani ulash
1. **New Project** → **Deploy from GitHub repo**
2. **FanzeeApp/iphone-shop** repo'sini tanlang (avval Railway'ga GitHub access bering)
3. Railway avtomatik ravishda `nixpacks.toml` ni topib build boshlaydi

### Qadam 3 — Environment variables qo'yish
**Variables** tabiga o'ting va quyidagilarni qo'shing:

| Kalit | Qiymat |
|---|---|
| `BOT_TOKEN` | `8698075259:AAGfb...` (BotFather token) |
| `CHANNEL_ID` | `-1001234567890` (kanaldan @userinfobot orqali) |
| `OWNER_ID` | sizning Telegram ID (https://t.me/getmyid_bot) |
| `DATA_DIR` | `/app/data` |

> **`WEB_APP_URL` ni yozish shart emas** — Railway domeni ulangach, `RAILWAY_PUBLIC_DOMAIN` env'idan o'zi olib qo'yiladi.

### Qadam 4 — Persistent volume (DB saqlash uchun) ⚠️ O'TKAZIB YUBORMANG
1. Service ichida **Volumes** tab
2. **Add Volume** → Mount path: `/app/data` → Create
3. (DATA_DIR allaqachon `/app/data` ga ko'rsatib turibdi)

> **Bu qadamsiz bazangiz har deploy va har restartda butunlay o'chadi.**
> Volume bo'lmasa `/app/data` konteynerning vaqtinchalik diskiga yoziladi.
> Yo'qoladigan narsalar: Mini App orqali qo'shilgan adminlar, o'zgartirilgan
> foizlar (`initial_percent`, `monthly_markup`, `no_initial_markup`,
> `admin_fee`), tahrirlangan kontakt ma'lumotlari va postlar tarixi.
> Egasi (`OWNER_ID`) va `src/db.js` dagi standart qiymatlar qayta yaratiladi,
> shuning uchun bot ishlashda davom etadi — sozlamalaringiz jim turib yo'qoladi.
>
> Tekshirish: `railway volume list` → bitta volume ko'rinishi kerak.

### Qadam 5 — Public domen olish
1. **Settings** → **Networking** → **Generate Domain**
2. `iphone-shop-production-xxxx.up.railway.app` kabi URL beradi
3. Bu URL'ni nusxalang

### Qadam 6 — BotFather'da Menu Button qo'yish
1. Telegram'da [@BotFather](https://t.me/BotFather) → `/mybots` → botingiz
2. **Bot Settings** → **Menu Button** → **Configure Menu Button**
3. Tugma matni: `📱 Admin Panel`
4. URL: Railway bergan domen (`https://iphone-shop-production-xxxx.up.railway.app`)

### Qadam 7 — Botni kanalga admin qilish
1. Telegram kanalingiz → kanal sozlamalari → **Administrators** → **Add Admin**
2. Botingizni qidiring va qo'shing
3. **Post Messages** ruxsatini bering

### Qadam 8 — Sinov
1. Botga `/start` yuboring
2. Menyu chiqadi → **📝 Yangi post yaratish** → forma to'ladi
3. Test post qiling — kanalga chiqishi kerak ✅

### Yangilanish (kelajakda)
Kodga o'zgartirish kiritsangiz:
```bash
git add . && git commit -m "update" && git push
```
Railway o'zi avtomatik qaytadan deploy qiladi.

## Boshqa platformalar

- **VPS + nginx**: HTTPS sertifikat (Let's Encrypt) + `pm2 start npm -- start`
- **Render**: Railway'ga juda o'xshash, lekin disk uchun pulli
- **Fly.io**: `fly launch` → `fly volumes create` → `fly deploy`

## Texnik eslatma

- SQLite fayli `${DATA_DIR}/shop.db` da saqlanadi (Railway'da `/app/data/shop.db`)
- Yuklangan rasmlar `${DATA_DIR}/uploads` ga **diskka** yoziladi va kanalga
  yuborilgandan keyin darhol o'chiriladi (`uploads/` bo'sh turishi normal)
- Telegram WebApp `initData` HMAC'i har bir API request'da tekshiriladi

### Xotira sarfi haqida

Rasmlar ataylab RAM'da emas, diskda bufer qilinadi. `multer.memoryStorage()`
bilan bitta post 6 ta rasmni to'liq RAM'ga yuklar edi (multipart koder har bir
buferni nusxalaydi → ~120MB), va Railway konteyneri Node'ga 24GB RAM ko'rsatgani
uchun V8 bu xotirani operatsion tizimga qaytarmas edi. Natijada bo'sh turgan
servis 475MB da qotib qolgan edi — oyiga ~$4.65.

Hozir rasmlar `InputFile(path)` orqali `createReadStream` bilan Telegram'ga
stream qilinadi, ya'ni fayl hech qachon to'liq xotiraga yuklanmaydi.

Qo'shimcha himoya sifatida Railway'da quyidagi o'zgaruvchilarni qo'yish mumkin:

```
NODE_OPTIONS = --max-old-space-size=192
MALLOC_ARENA_MAX = 2
```

Birinchisi V8 heap'ini cheklaydi, ikkinchisi glibc allokatorining
fragmentatsiyasini kamaytiradi. Rasm buferlari V8 heap'idan tashqarida
(`external` xotira) yashaganligi uchun bu o'zgaruvchilar yolg'iz o'zi
yetarli emas — asosiy yechim yuqoridagi stream'ga o'tish.

## Loyiha tuzilishi

```
shabloner/
├── src/
│   ├── server.js       # Express + bot ishga tushirish
│   ├── bot.js          # Telegram bot komandalari
│   ├── routes.js       # /api endpointlari
│   ├── auth.js         # Telegram initData verifikatsiyasi
│   ├── db.js           # SQLite (admins, settings, posts)
│   ├── parser.js       # Avto-to'ldirish parseri
│   ├── calculator.js   # To'lov rejasi formulasi
│   ├── formatter.js    # Kanal post ko'rinishi
│   ├── channel.js      # Kanalga yuborish
│   └── config.js       # .env yuklash
├── public/
│   ├── index.html      # Mini App
│   ├── app.js
│   └── styles.css
├── data/               # SQLite + rasm yuklamalari (avto-yaratiladi)
├── .env.example
└── package.json
```

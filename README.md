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
oylik_X    = ⌈(narx − bosh_tolov) × (100 + markup_X) / 100 / X⌉
```

Stavkalar (`Sozlamalar` tabidan) misoldagi 900$ telefon uchun standart qiymatlar:
- `initial_percent = 50` → bosh = 450$
- `markup_3 = 15.3` → 173$/oy
- `markup_6 = 25.3` → 94$/oy
- `markup_9 = 42` → 71$/oy
- `markup_12 = 52` → 57$/oy

Foizlarni keyin o'zingizga moslab Sozlamalar tabidan o'zgartirasiz.

## Production

- HTTPS sertifikatli VPS yoki Cloud platformaga (Railway, Render, Fly.io, VPS+nginx) joylash kifoya.
- SQLite fayli `data/shop.db` da saqlanadi — backupni shu papka uchun yoqing.
- Yuklangan rasmlar yuborishdan keyin avtomatik o'chiriladi (`data/uploads/` bo'sh turishi normal).

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

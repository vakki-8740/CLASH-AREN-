# Clash Arena — Tournament Registration System

## Idea kya hai?

Clash Arena ek simple **tournament registration aur management system** hai. Iska main kaam hai: player ka registration lena, entry fee ka payment/UPI screenshot lena, aur admin ko ek jagah par saara data manage karne dena.

Pehle log WhatsApp/Telegram par screenshot bhejte hain, admin manually list banata hai, aur entries miss ho jaati hain. Is project me poora flow ek jagah aa jata hai:

1. Player registration form bharta hai.
2. Entry fee ka QR scan karke payment karta hai.
3. Payment screenshot aur UTR number upload karta hai.
4. Data Firestore me save hota hai.
5. Player apna status mobile number se check kar sakta hai.
6. Admin panel me approve/reject, settings aur rules manage hote hain.

## Pages

| Page | URL | Kaam |
|------|-----|------|
| Registration | `/` | Player details, payment QR, screenshot upload, request status inbox |
| Joined Players | `/join/` | Approved players ki public list + search |
| Rules | `/rule/` | Tournament rules (admin se editable) |
| Admin Panel | `/admin/` | Stats, payments, players, settings, rules |

## Player Flow

1. **Registration form** — naam, Free Fire ID name, ID number, level, mobile number.
2. **Payment page** — UPI QR scan ya UPI ID par payment, phir payment name, UTR number aur screenshot upload.
3. **Submit** — request `pending` status ke saath Firestore me save hoti hai. Agar Telegram bot configured hai to screenshot admin ke Telegram par bhi chala jata hai.
4. **Inbox** — player apne mobile number se apni request ka status dekh sakta hai (`pending`, `approved`, `rejected`).
5. **Joined list** — approve hone ke baad player ka naam `/join/` page par dikhta hai.

## Admin Panel

- **Stats** — total, pending, approved aur rejected players ka count.
- **Payments** — pending/approved/rejected filter, search, screenshot dekhna, approve/reject/delete.
- **Players** — approved player manually add karna, edit karna, delete karna.
- **Settings** — tournament name, entry fee, UPI ID/QR, prize pool, match time, slots, announcement, Telegram bot token/chat ID.
- **Rules** — rules add/edit/delete; yehi rules `/rule/` page par dikhte hain.
- **PWA** — admin panel ko phone par install kiya ja sakta hai (manifest + service worker).

## Tech Stack

- **Frontend:** plain HTML, CSS, JavaScript (koi build tool nahi).
- **UI:** OWN Library design system (`assets/ui.css`, `assets/app.js`), light/dark theme.
- **Database:** Firebase Firestore (compat SDK 10.12.0).
- **Notifications:** Telegram Bot API (optional).
- **QR:** qrcodejs (UPI QR generate karne ke liye).
- **Hosting:** koi bhi static host — GitHub Pages, Netlify, Vercel, Firebase Hosting.

## Project Structure

```text
clash-arena/
  index.html              # entry page (registration)
  firebase-config.js      # Firebase config + default settings + settings loader
  assets/
    ui.css                # design system
    app.js                # theme, toast, overlay helpers
  join/index.html         # approved players
  rule/index.html         # tournament rules
  admin/
    index.html            # admin panel
    manifest.json         # PWA manifest
    sw.js                 # service worker (cache v3)
    icons/                # PWA icons
  PROJECT LOGO/           # logo images
```

## Firestore Data

### `players` collection

| Field | Type | Description |
|-------|------|-------------|
| `userName` | string | Player ka naam |
| `gameIdName` | string | In-game name |
| `gameIdNumber` | string | Game ID number |
| `gameIdLevel` | string | Game level |
| `mobileNumber` | string | Player ka mobile number |
| `paymentName` | string | Payment kis naam se kiya |
| `utrNumber` | string | UTR / transaction reference |
| `screenshot` | string | Payment screenshot (base64 JPEG) |
| `status` | string | `pending`, `approved`, `rejected` |
| `createdAt` | timestamp | Request time |
| `addedByAdmin` | boolean | Admin ne manually add kiya to `true` |

### `settings/main` document

`tournamentName`, `entryFee`, `upiId`, `qrUrl`, `upiName`, `prizePool`, `matchTime`, `maxPlayers`, `announcement`, `telegramBotToken`, `telegramChatId`, `rules`.

## Deploy Kaise Kare

Project static hai, koi build command ki zaroorat nahi.

- **GitHub Pages:** Settings → Pages → Branch `main`, folder `/ (root)`.
- **Netlify:** Base directory blank, build command blank, publish directory `.`.
- **Vercel:** Root directory `./`, framework `Other`, build command off, output directory `.`.

Root directory ko `index/` mat banana — entry file ab seedha repo root me `index.html` hai. Deploy ke baad site `/` par khulegi aur admin `/admin/` par.

## Local Run

Kisi bhi static server se project root serve karo:

```bash
python3 -m http.server 8080
```

Phir browser me `http://localhost:8080/` kholo. Direct file open karne par Firebase aur service worker theek se kaam nahi karenge.

## Zaroori Note

Abhi admin panel me login/auth nahi hai. Production me use karne se pehle admin panel par authentication lagana chahiye, warna URL jaanne wala koi bhi data edit/delete kar sakta hai. Public pages bhi Firestore se players padhte hain, isliye Firestore security rules ko production ke hisaab se tight karna zaroori hai.

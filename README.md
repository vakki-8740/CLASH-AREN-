# Clash Arena — Tournament Platform

## Idea kya hai?

Clash Arena ek mobile-first tournament platform hai. Player mobile number + password se account banata hai, tournaments dekh kar join karta hai, results aur winnings dekhta hai, referral share karta hai aur apna wallet/profile manage karta hai.

Admin panel se tournaments, winners, settings, rules aur purane player/payment records manage hote hain.

## Pages

| Page | URL | Kaam |
|------|-----|------|
| Login / Register | `/` | Mobile + password auth, referral code optional |
| Home | `/home/` | Tournaments list, slots, entry fee, status |
| Tournament Details | `/tournament/?id=...` | Full details, rules, room credentials (join ke baad), Join button |
| Results | `/results/` | Published winners aur prize details |
| Referral | `/referral/` | Referral code, share link, referred users |
| Wallet | `/wallet/` | Balance, totals, transaction history (read-only) |
| Profile | `/profile/` | Account details, joined tournaments, password change, logout |
| Joined Players (legacy) | `/join/` | Purane `players` collection ke approved players |
| Rules (legacy) | `/rule/` | Admin-editable tournament rules |
| Admin Panel | `/admin/` | Players, payments, tournaments, results, settings, rules |

## User Flow

1. **Register** — username, 10-digit mobile number, password aur optional referral code.
2. **Login** — mobile number + password. Password Firebase Authentication ke paas secure rehta hai.
3. **Home** — open/upcoming tournaments, prize pool, entry fee aur remaining slots.
4. **Join Tournament** — Firestore transaction duplicate join aur slot overbooking rokta hai.
5. **Room details** — join ke baad hi room ID/password dikhte hain.
6. **Results** — admin ke publish kiye winners aur prizes.
7. **Profile** — naam update, password change, joined matches aur logout.

### Auth kaise kaam karta hai?

Firebase Auth me email/password provider use hota hai. Mobile number ko internal email me map kiya jata hai:

```text
m<10-digit-mobile>@clasharena.app
```

Player ko email dikhti nahi hai. Sirf mobile number se login hota hai.

**Zaroori setup:** Firebase Console → Authentication → Sign-in method → **Email/Password** enable karna hoga. Ye provider disabled hone par app setup hint dikhata hai, lekin login/register kaam nahi karega.

## Admin Panel

- **Players** — purane `players` collection ke approved players manually add/edit/delete.
- **Payments** — pending/approved/rejected payment requests, screenshot, approve/reject.
- **Tournaments** — tournament create/edit/delete, status, slots, room details, prize distribution.
- **Results** — winner entries publish/delete; published results user app me dikhte hain.
- **Settings** — tournament name, entry fee, UPI/QR, prize pool, slots, announcement, Telegram, referral reward.
- **Rules** — rules add/edit/delete; `/rule/` page par dikhte hain.

## Tech Stack

- Plain HTML, CSS, JavaScript — koi build tool nahi.
- Firebase Firestore + Firebase Authentication (compat SDK 10.12.0).
- OWN Library design system: `assets/ui.css`, `assets/app.js`.
- Shared auth/page shell: `assets/auth.js`, `assets/app-nav.js`.
- PWA admin panel: `admin/manifest.json`, `admin/sw.js`.
- Hosting: GitHub Pages, Netlify, Vercel ya Firebase Hosting.

## Project Structure

```text
clash-arena/
  index.html              # login / register
  firebase-config.js      # Firebase config, defaults, settings loader
  assets/
    ui.css                # design system
    app.js                # theme, toast, overlay, helpers
    auth.js               # Auth + user profile functions
    app-nav.js            # bottom nav, page boot, formatters
  home/index.html         # tournament listing
  tournament/index.html   # details + join flow
  results/index.html      # published results
  referral/index.html     # referral dashboard
  wallet/index.html       # wallet + transactions
  profile/index.html      # account, history, password
  join/index.html         # legacy approved players
  rule/index.html         # tournament rules
  admin/
    index.html            # admin panel
    manifest.json         # PWA manifest
    sw.js                 # service worker (cache v4)
    icons/                # PWA icons
  PROJECT LOGO/           # logo images
```

## Firestore Data

### `users/{uid}`

| Field | Type | Description |
|-------|------|-------------|
| `userName` | string | Player ka display name |
| `mobile` | string | 10-digit mobile number |
| `referralCode` | string | Unique code (`CA` + UID prefix) |
| `referredBy` | string | Referrer ka user doc ID, ya empty |
| `createdAt` | timestamp | Account creation time |
| `wallet` | map | `balance`, `totalEarnings`, `totalDeposits`, `totalWithdrawals` |

### `tournaments/{id}`

`name`, `game`, `description`, `entryFee`, `prizePool`, `matchDate`, `totalSlots`, `joinedCount`, `status`, `matchFormat`, `rules`, `roomId`, `roomPassword`, `prizeDistribution`, `createdAt`, `updatedAt`.

Status values: `open`, `upcoming`, `full`, `ongoing`, `completed`, `cancelled`, `closed`.

### `joins/{tournamentId_uid}`

`tournamentId`, `tournamentName`, `game`, `matchDate`, `entryFee`, `prizePool`, `userId`, `userName`, `mobile`, `status`, `joinedAt`.

Doc ID `tournamentId_uid` hai, isliye same user dobara join nahi kar sakta. Join Firestore transaction me hota hai jo `joinedCount` bhi update karta hai.

### `results/{id}`

`tournamentId`, `tournamentName`, `game`, `matchDate`, `winnerName`, `rank`, `prize`, `status`, `createdAt`.

User app sirf `status: "published"` results dikhata hai.

### `transactions/{id}`

`userId`, `type` (`deposit`, `withdraw`, `referral`, `prize`, `refund`), `amount`, `status` (`pending`, `successful`, `failed`), `note`, `createdAt`.

Wallet page inhe read-only dikhata hai.

### `settings/main`

`tournamentName`, `entryFee`, `upiId`, `qrUrl`, `upiName`, `prizePool`, `matchTime`, `maxPlayers`, `announcement`, `telegramBotToken`, `telegramChatId`, `rules`, `referralReward`.

### Legacy `players/{id}`

Purana registration/payment flow `players` collection use karta hai: `userName`, `gameIdName`, `gameIdNumber`, `gameIdLevel`, `mobileNumber`, `paymentName`, `utrNumber`, `screenshot`, `status`, `createdAt`, `addedByAdmin`. `/join/` aur admin ke Players/Payments tabs abhi isi collection par chalte hain.

## Deploy Kaise Kare

Project static hai, koi build command ki zaroorat nahi.

- **GitHub Pages:** Settings → Pages → Branch `main`, folder `/ (root)`.
- **Netlify:** Base directory blank, build command blank, publish directory `.`.
- **Vercel:** Root directory `./`, framework `Other`, build command off, output directory `.`.

Deploy ke baad site `/` par khulegi aur admin `/admin/` par. Root directory ko `index/` mat banana — entry file repo root me `index.html` hai.

## Local Run

Project root se koi static server chalao:

```bash
python3 -m http.server 8080
```

Phir `http://localhost:8080/` kholo. Direct file open karne par Firebase aur service worker theek se kaam nahi karenge.

## Important Limitations / Security

- **Email/Password provider enable karna zaroori hai**, warna auth kaam nahi karega.
- **Admin panel me abhi authentication nahi hai.** URL jaanne wala koi bhi data edit/delete kar sakta hai.
- **Firestore security rules production-ready nahi hain.** Rules deploy karna zaroori hai; warna client se wallet/transactions/tournaments tamper ho sakte hain.
- **Wallet read-only hai.** Deposit/withdraw buttons disabled hain; payment gateway/backend nahi hai.
- **Referral reward automatically credit nahi hota.** Sirf configured reward aur referred users dikhte hain.
- **Join hone par entry fee debit nahi hoti.** Join transaction sirf slot reserve karta hai.
- **New joins admin me player-wise list nahi dikhte.** Admin tournament manager count dikhata hai; detailed `joins` management abhi add nahi hui.
- **Legacy aur new data alag hain:** `/join/` aur admin Players `players` collection use karte hain, jabki naya app `users` + `joins` use karta hai.
- Static frontend se koi bhi client-side validation bypass kar sakta hai; sensitive operations backend/Cloud Functions se hi secure honge.

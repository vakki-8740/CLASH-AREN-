# QREN Esports — Tournament Platform

## Idea kya hai?

QREN Esports ek mobile-first tournament platform hai. Player mobile number + password se account banata hai, tournaments dekh kar join karta hai, results aur winnings dekhta hai, referral share karta hai aur apna wallet/profile manage karta hai.

Admin panel password-protected hai. Admin tournaments, winners, settings, rules, players aur payments manage karta hai.

## Pages

| Page | URL | Kaam |
|------|-----|------|
| Login / Register | `/` | Mobile + password auth, optional referral code |
| Home | `/home/` | Tournaments list, slots, entry fee, status |
| Tournament Details | `/tournament/?id=...` | Details, rules, room credentials (join ke baad), Join button |
| Results | `/results/` | Published winners aur prize details |
| Referral | `/referral/` | Referral code, share link, referred users |
| Wallet | `/wallet/` | Balance, totals, transaction history (read-only) |
| Profile | `/profile/` | Account details, joined tournaments, password change, logout |
| Joined Players | `/join/` | Approved public player list |
| Rules | `/rule/` | Admin-editable tournament rules |
| Admin Panel | `/admin/` | Login-protected admin dashboard |

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

Player ko email dikhti nahi hai. Sirf mobile number se login hota hai. Registration par `users`, `referralCodes` aur (agar referral use hua ho) `referrals` docs ek batch me save hote hain.

## Admin Setup

1. Firebase Console → Authentication → Sign-in method → **Email/Password** enable karo.
2. Authentication → Users → **Add user** se admin ka email/password account banao.
3. Us user ka **UID** copy karo.
4. Firestore me `admins/{UID}` document banao (empty doc chalega).
5. `/admin/` kholo aur admin email/password se login karo.

`admins/{UID}` doc na hone par login reject ho jayega. Admin writes sirf isi doc wale accounts ke liye allowed hain.

## Admin Panel

- **Players** — player add/edit/delete; approve/reject.
- **Payments** — pending/approved/rejected payment requests, screenshot, approve/reject.
- **Tournaments** — create/edit/delete, status, slots, room details, prize distribution.
- **Results** — winner entries publish/delete.
- **Settings** — tournament name, entry fee, UPI/QR, prize pool, slots, announcement, Telegram, referral reward.
- **Rules** — rules add/edit/delete; `/rule/` page par dikhte hain.

Payment screenshots aur UTR admin-only `players_private` me rehte hain. Public `players_public` me sirf safe player fields jate hain.

## Tech Stack

- Plain HTML, CSS, JavaScript — koi build tool nahi.
- Firebase Firestore + Firebase Authentication (compat SDK 10.12.0).
- OWN Library design system: `assets/ui.css`, `assets/app.js`.
- Shared auth/page shell: `assets/auth.js`, `assets/app-nav.js`.
- PWA admin panel: `admin/manifest.json`, `admin/sw.js` (cache v5).
- Hosting: GitHub Pages, Netlify, Vercel ya Firebase Hosting.

## Project Structure

```text
qren-esports/
  index.html               # login / register
  firebase-config.js       # Firebase config, defaults, public settings loader
  firestore.rules          # recommended Firestore security rules
  firestore-rules.txt      # console me paste karne ke liye same rules
  assets/
    ui.css                 # design system
    app.js                 # theme, toast, overlay, helpers
    auth.js                # Auth + profile + referral writes
    app-nav.js             # bottom nav, page boot, formatters
  home/index.html          # tournament listing
  tournament/index.html    # details + join + private room details
  results/index.html       # published results
  referral/index.html      # referral dashboard
  wallet/index.html        # wallet + transactions
  profile/index.html       # account, history, password
  join/index.html          # approved public players
  rule/index.html          # tournament rules
  admin/
    index.html             # admin login + panel
    manifest.json          # PWA manifest
    sw.js                  # service worker (cache v5)
    icons/                 # PWA icons
  PROJECT LOGO/            # logo images
```

## Firestore Data

### `users/{uid}`

| Field | Type | Description |
|-------|------|-------------|
| `userName` | string | Player ka display name |
| `mobile` | string | 10-digit mobile number |
| `referralCode` | string | Unique code (`CA` + UID prefix) |
| `referredBy` | string | Referrer ka UID, ya empty |
| `createdAt` | timestamp | Account creation time |
| `wallet` | map | `balance`, `totalEarnings`, `totalDeposits`, `totalWithdrawals` |

Client sirf `userName` update kar sakta hai. Wallet fields client se immutable hain.

### `referralCodes/{code}`

Public `get`-only lookup doc: `code`, `uid`, `userName`, `createdAt`. Isme mobile/wallet nahi hota.

### `referrals/{referrerUid_referredUid}`

`referrerUid`, `referredUid`, `referredUserName`, `createdAt`. Referral page sirf apne referrals list kar sakta hai.

### `tournaments/{id}`

Public data: `name`, `game`, `description`, `entryFee`, `prizePool`, `matchDate`, `totalSlots`, `joinedCount`, `status`, `matchFormat`, `rules`, `prizeDistribution`, `createdAt`, `updatedAt`.

**Room ID/password public doc me nahi hote.** Wo `tournament_private/{id}` me hain.

### `tournament_private/{id}`

`tournamentId`, `roomId`, `roomPassword`, `updatedAt`. Sirf admin aur joined players read kar sakte hain.

### `joins/{tournamentId_uid}`

`tournamentId`, `tournamentName`, `game`, `matchDate`, `entryFee`, `prizePool`, `userId`, `userName`, `mobile`, `status`, `joinedAt`.

### `joinLocks/{tournamentId_uid}`

`tournamentId`, `userId`, `counted`, `createdAt`. Ye lock ensure karta hai ki ek player ek tournament me sirf ek baar `joinedCount` badha sake.

### `results/{id}`

`tournamentId`, `tournamentName`, `game`, `matchDate`, `winnerName`, `rank`, `prize`, `status`, `createdAt`.

### `transactions/{id}`

`userId`, `type` (`deposit`, `withdraw`, `referral`, `prize`, `refund`), `amount`, `status` (`pending`, `successful`, `failed`), `note`, `createdAt`.

Wallet page inhe read-only dikhata hai. Client transactions write nahi kar sakta.

### `players_private/{id}` aur `players_public/{id}`

`players_private` me poora payment record (UTR, screenshot, mobile, etc.) admin-only. `players_public` me sirf approved player ke safe fields public list ke liye.

### `settings/public` aur `settings/private`

Public: `tournamentName`, `entryFee`, `upiId`, `qrUrl`, `upiName`, `prizePool`, `matchTime`, `maxPlayers`, `announcement`, `referralReward`, `rules`.

Private: `telegramBotToken`, `telegramChatId`. Ye client ko kabhi expose nahi hote.

### `admins/{uid}`

Admin access marker. Is doc ka hona hi admin panel writes allow karta hai. Client ise read/write nahi kar sakta; console/Admin SDK se banao.

## Security Rules

`firestore.rules` aur `firestore-rules.txt` me same rules hain. Firebase Console → Firestore Database → Rules → paste → **Publish**.

Rules ka summary:

- Users apna profile read kar sakte hain; wallet/transactions client se write nahi ho sakte.
- Public tournaments/results/settings read hain; private room/token data admin-only.
- Join transaction `joins` + `joinLocks` + `joinedCount` rules se validate hota hai.
- Admin writes `admins/{uid}` doc se gate hain.
- Unknown collections default deny hain.

## Deploy Kaise Kare

Project static hai, koi build command ki zaroorat nahi.

- **GitHub Pages:** Settings → Pages → Branch `main`, folder `/ (root)`.
- **Netlify:** Base directory blank, build command blank, publish directory `.`.
- **Vercel:** Root directory `./`, framework `Other`, build command off, output directory `.`.

Deploy ke baad site `/` par khulegi aur admin `/admin/` par.

## Local Run

Project root se static server chalao:

```bash
cd /storage/emulated/0/workpleace/qren-esports
python3 -m http.server 8080
```

Phir `http://localhost:8080/` kholo. Direct file open karne par Firebase aur service worker theek se kaam nahi karenge.

## Important Limitations

- **Wallet read-only hai.** Deposit/withdraw buttons disabled hain; payment gateway/backend nahi hai.
- **Referral reward automatically credit nahi hota.** Sirf configured reward aur referred users dikhte hain.
- **Join hone par entry fee debit nahi hoti.** Join transaction sirf slot reserve karta hai.
- **Admin player-wise joins list nahi dikhata.** Tournament manager count dikhata hai.
- **Public results draft bhi read kar sakte hain** (rules public read allow karte hain). Sensitive results ho to status-based query add karo.
- Static frontend se client-side validation bypass ho sakti hai; wallet/reward/prize credit backend/Cloud Functions se hi secure honge.

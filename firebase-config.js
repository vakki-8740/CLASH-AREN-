/* ==========================================================
   FIREBASE SETUP - Clash Arena Tournament
   ----------------------------------------------------------
   STEP 1: Go to https://console.firebase.google.com
   STEP 2: Create a project, then go to Build -> Firestore
           Database and click "Create database" (Production mode)
   STEP 3: Go to Project Settings -> Your apps -> Add app
           (Web), register a web app and copy the config
           values below
   STEP 4: Enable Authentication -> Sign-in method -> Email/Password
   STEP 5: Paste Firestore rules from firestore.rules
   STEP 6: Upload all folders to any static host
           (Netlify / Vercel / Firebase Hosting)
   ========================================================== */

const FIREBASE_CONFIG = {
    apiKey: "AIzaSyCHYRqHF__EqHOxEXap-QvkHLmamfdaotU",
    authDomain: "clash-arena-cb69a.firebaseapp.com",
    projectId: "clash-arena-cb69a",
    storageBucket: "clash-arena-cb69a.firebasestorage.app",
    messagingSenderId: "300063887305",
    appId: "1:300063887305:web:6db4678be2ef60a91ba218"
};

const FIREBASE_CONFIGURED = FIREBASE_CONFIG.apiKey !== "YOUR_API_KEY";

let firebaseApp = null;
let db = null;

if (FIREBASE_CONFIGURED && typeof firebase !== 'undefined') {
    firebaseApp = firebase.initializeApp(FIREBASE_CONFIG);
    db = firebase.firestore();
}

const DEFAULT_SETTINGS = {
    tournamentName: 'Clash Arena',
    entryFee: 199,
    upiId: '',
    qrUrl: '',
    telegramBotToken: '',
    telegramChatId: '',
    upiName: 'Clash Arena',
    prizePool: '₹5,000',
    matchTime: '9:00 PM',
    maxPlayers: 100,
    announcement: '',
    referralReward: 0,
    rules: [
        { title: 'Fair Play Only', description: 'Any use of hacks, mods, or third-party tools will result in immediate disqualification.' },
        { title: 'Entry Fee Non-Refundable', description: 'Once paid, the entry fee is non-refundable under any circumstances.' },
        { title: 'On-Time Check-In', description: 'Players must check in 15 minutes before match start. Late entries will not be allowed.' },
        { title: 'Valid ID Required', description: 'All players must use the same Game ID submitted during registration throughout the tournament.' },
        { title: 'No Team Switching', description: 'Once teams are finalized, no player substitutions or team changes are permitted.' },
        { title: 'Recording Mandatory', description: 'Every player must screen-record their gameplay. Failure to provide proof may void results.' },
        { title: 'Dispute Resolution', description: 'All disputes will be resolved by tournament admins. Their decision is final and binding.' },
        { title: 'Prize Distribution', description: 'Prizes will be credited within 48 hours after tournament completion to the registered UPI.' },
        { title: 'Communication Rules', description: 'Toxic behaviour, abuse, or harassment in chat or voice will lead to a permanent ban.' },
        { title: 'Device Responsibility', description: 'Players are responsible for their own internet and device issues. No rematches will be given.' }
    ]
};

let cachedSettings = null;

function withTimeout(promise, ms) {
    return new Promise((resolve, reject) => {
        const t = setTimeout(() => reject(new Error('timeout')), ms);
        promise.then(
            v => { clearTimeout(t); resolve(v); },
            e => { clearTimeout(t); reject(e); }
        );
    });
}

async function fetchSettings() {
    if (!FIREBASE_CONFIGURED || !db) {
        cachedSettings = JSON.parse(JSON.stringify(DEFAULT_SETTINGS));
        return cachedSettings;
    }
    try {
        const snap = await withTimeout(db.collection('settings').doc('public').get(), 6000);
        cachedSettings = snap.exists
            ? Object.assign({}, DEFAULT_SETTINGS, snap.data())
            : JSON.parse(JSON.stringify(DEFAULT_SETTINGS));
    } catch (e) {
        cachedSettings = JSON.parse(JSON.stringify(DEFAULT_SETTINGS));
    }
    return cachedSettings;
}

function getSettings() {
    if (!cachedSettings) return JSON.parse(JSON.stringify(DEFAULT_SETTINGS));
    return cachedSettings;
}

function fmtTime(ts) {
    if (!ts) return '';
    const d = (ts && ts.toDate) ? ts.toDate() : new Date(ts);
    return d.toLocaleString('en-IN', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' });
}

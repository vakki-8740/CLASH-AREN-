import { db, FIREBASE_CONFIGURED } from "./firebase";

export const DEFAULT_SETTINGS = {
    tournamentName: "QREN Esports",
    entryFee: 199,
    upiId: "",
    qrUrl: "",
    telegramBotToken: "",
    telegramChatId: "",
    upiName: "QREN Esports",
    prizePool: "₹5,000",
    matchTime: "9:00 PM",
    maxPlayers: 100,
    announcement: "",
    referralReward: 0,
    rules: [
        { title: "Fair Play Only", description: "Any use of hacks, mods, or third-party tools will result in immediate disqualification." },
        { title: "Entry Fee Non-Refundable", description: "Once paid, the entry fee is non-refundable under any circumstances." },
        { title: "On-Time Check-In", description: "Players must check in 15 minutes before match start. Late entries will not be allowed." },
        { title: "Valid ID Required", description: "All players must use the same Game ID submitted during registration throughout the tournament." },
        { title: "No Team Switching", description: "Once teams are finalized, no player substitutions or team changes are permitted." },
        { title: "Recording Mandatory", description: "Every player must screen-record their gameplay. Failure to provide proof may void results." },
        { title: "Dispute Resolution", description: "All disputes will be resolved by tournament admins. Their decision is final and binding." },
        { title: "Prize Distribution", description: "Prizes will be credited within 48 hours after tournament completion to the registered UPI." },
        { title: "Communication Rules", description: "Toxic behaviour, abuse, or harassment in chat or voice will lead to a permanent ban." },
        { title: "Device Responsibility", description: "Players are responsible for their own internet and device issues. No rematches will be given." }
    ]
};

let cachedSettings = null;
let pending = null;

function withTimeout(promise, ms) {
    return new Promise((resolve, reject) => {
        const timer = setTimeout(() => reject(new Error("timeout")), ms);
        promise.then(
            value => { clearTimeout(timer); resolve(value); },
            error => { clearTimeout(timer); reject(error); }
        );
    });
}

export async function fetchSettings(force = false) {
    if (pending && !force) return pending;
    if (cachedSettings && !force) return cachedSettings;

    pending = (async () => {
        if (!FIREBASE_CONFIGURED || !db) {
            cachedSettings = JSON.parse(JSON.stringify(DEFAULT_SETTINGS));
            return cachedSettings;
        }
        try {
            const snap = await withTimeout(db.collection("settings").doc("public").get(), 6000);
            cachedSettings = snap.exists
                ? Object.assign({}, DEFAULT_SETTINGS, snap.data())
                : JSON.parse(JSON.stringify(DEFAULT_SETTINGS));
        } catch {
            cachedSettings = JSON.parse(JSON.stringify(DEFAULT_SETTINGS));
        }
        pending = null;
        return cachedSettings;
    })();

    return pending;
}

export function getSettings() {
    if (!cachedSettings) return JSON.parse(JSON.stringify(DEFAULT_SETTINGS));
    return cachedSettings;
}

export async function fetchPrivateSettings() {
    if (!FIREBASE_CONFIGURED || !db) return {};
    try {
        const snap = await db.collection("settings").doc("private").get();
        return snap.exists ? snap.data() : {};
    } catch {
        return {};
    }
}

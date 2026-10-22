import { useEffect, useState } from "react";
import { db } from "../lib/firebase";
import { fmtDate, initials, money, toMillis } from "../lib/format";
import { toast } from "../lib/toast";
import { useAuth } from "../context/AuthContext";
import { useSettings } from "../context/SettingsContext";
import Topbar from "../components/Topbar";
import BottomNav from "../components/BottomNav";

function copyText(text) {
    if (navigator.clipboard && window.isSecureContext) return navigator.clipboard.writeText(text);
    return new Promise((resolve, reject) => {
        try {
            const element = document.createElement("textarea");
            element.value = text;
            element.style.position = "fixed";
            element.style.opacity = "0";
            document.body.appendChild(element);
            element.focus();
            element.select();
            const ok = document.execCommand("copy");
            document.body.removeChild(element);
            if (ok) resolve();
            else reject(new Error("copy-failed"));
        } catch (err) {
            reject(err);
        }
    });
}

export default function ReferralPage() {
    const { user, profile } = useAuth();
    const settings = useSettings();
    const [referrals, setReferrals] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");
    const code = profile?.referralCode || ("CA" + String(user?.uid || "").replace(/[^a-z0-9]/gi, "").slice(0, 6)).toUpperCase();

    useEffect(() => {
        document.title = "QREN Esports — Referral";
    }, []);

    useEffect(() => {
        if (!user || !profile) return;
        let active = true;
        (async () => {
            try {
                const snap = await db.collection("referrals").where("referrerUid", "==", user.uid).get();
                const list = [];
                snap.forEach(doc => list.push({ ...doc.data(), id: doc.id }));
                list.sort((a, b) => toMillis(b.createdAt) - toMillis(a.createdAt));
                if (active) setReferrals(list);
            } catch (err) {
                console.error(err);
                if (active) setError("Referral list load nahi ho payi. Firestore permissions check karo.");
            } finally {
                if (active) setLoading(false);
            }
        })();
        return () => { active = false; };
    }, [user, profile]);

    function shareLink() {
        return new URL(`${import.meta.env.BASE_URL}?ref=${encodeURIComponent(code)}`, window.location.origin).href;
    }

    function shareText() {
        return `QREN Esports join karo! Mera referral code: ${code} — ${shareLink()}`;
    }

    async function copyReferral() {
        if (!code) return;
        try {
            await copyText(code);
            toast("Referral code copied", "success");
        } catch {
            toast("Copy nahi ho paya. Code manually select karo.", "danger");
        }
    }

    async function shareReferral() {
        if (!code) return;
        if (navigator.share) {
            navigator.share({ title: "QREN Esports", text: `Mera referral code: ${code}`, url: shareLink() }).catch(() => {});
            return;
        }
        try {
            await copyText(shareText());
            toast("Invite link copied", "success");
        } catch {
            toast("Share nahi ho paya", "danger");
        }
    }

    const reward = Number(settings.referralReward) || 0;

    return (
        <>
            <Topbar sub="Referral" />
            <main className="shell">
                <div className="app-head">
                    <div>
                        <h1>Referral</h1>
                        <p>Dosto ko invite karo aur apna referral track karo.</p>
                    </div>
                </div>

                <div className="detail-block">
                    <h2>Your referral code</h2>
                    <div className="ref-code-box">
                        <span className="ref-code" id="refCode">{code || "—"}</span>
                        <span className="badge info">Invite</span>
                    </div>
                    <div className="ref-actions">
                        <button className="btn outline" type="button" id="copyBtn" onClick={copyReferral}>
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><rect x="9" y="9" width="12" height="12" rx="2" /><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" /></svg>
                            Copy code
                        </button>
                        <button className="btn primary" type="button" id="shareBtn" onClick={shareReferral}>
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><circle cx="18" cy="5" r="3" /><circle cx="6" cy="12" r="3" /><circle cx="18" cy="19" r="3" /><path d="m8.6 10.5 6.8-4" /><path d="m8.6 13.5 6.8 4" /></svg>
                            Share
                        </button>
                    </div>
                    <p className="help" style={{ fontSize: ".73rem", color: "var(--muted)", marginTop: 10 }}>Naye player register karte waqt ye code optional field me daal sakte hain.</p>
                </div>

                <div className="wallet-summary" style={{ gridTemplateColumns: "repeat(2,minmax(0,1fr))" }}>
                    <div className="ws"><span>Total referrals</span><strong id="refCount">{referrals.length}</strong></div>
                    <div className="ws"><span>Reward per referral</span><strong id="refReward">{reward > 0 ? money(reward) : "Not configured"}</strong></div>
                </div>

                <p className="section-label">Joined through your code</p>

                <div id="referredList" className="list" style={{ display: referrals.length && !loading ? "flex" : "none" }}>
                    {referrals.map(item => {
                        const name = item.referredUserName || item.userName || "Player";
                        return (
                            <div className="row-card" key={item.id}>
                                <span className="avatar">{initials(name)}</span>
                                <div className="row-main">
                                    <p className="row-title">{name}</p>
                                    <p className="row-sub">Joined {fmtDate(item.createdAt) || "recently"}</p>
                                </div>
                                <span className="badge success"><span className="dot" />Referred</span>
                            </div>
                        );
                    })}
                </div>

                {loading ? (
                    <div id="referredSkeleton" className="list">
                        <div className="skel-card"><div className="skeleton skel-line w60" /><div className="skeleton skel-line w40" /></div>
                    </div>
                ) : null}

                {!loading && referrals.length === 0 ? (
                    <div className="empty" id="refEmpty" style={{ display: "block" }}>
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><circle cx="18" cy="5" r="3" /><circle cx="6" cy="12" r="3" /><circle cx="18" cy="19" r="3" /><path d="m8.6 10.5 6.8-4" /><path d="m8.6 13.5 6.8 4" /></svg>
                        <h3>Abhi koi referral nahi</h3>
                        <p>Apna code share karo — naya player register hote hi yahan dikhega.</p>
                    </div>
                ) : null}

                {error ? (
                    <div className="alert danger" id="refError" style={{ display: "flex" }}>
                        <span id="refErrorText">{error}</span>
                    </div>
                ) : null}

                <p className="help" style={{ fontSize: ".72rem", color: "var(--muted)", marginTop: 14 }}>Reward sirf tab credit hoga jab backend par defined conditions poori hongi. Is page par koi reward manually add nahi hota.</p>
            </main>
            <BottomNav active="referral" />
        </>
    );
}

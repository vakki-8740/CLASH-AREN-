import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { db } from "../lib/firebase";
import { useAuth } from "../context/AuthContext";
import { effectiveStatus, fmtTime, money, number, remainingSlots, safeHttpUrl, statusInfo } from "../lib/format";
import Topbar from "../components/Topbar";
import BottomNav from "../components/BottomNav";
import GameIcon from "../components/GameIcon";

function sortTournaments(list) {
    const order = { open: 0, upcoming: 1, ongoing: 2, full: 3, closed: 4, completed: 5, cancelled: 6 };
    return [...list].sort((a, b) => {
        const sa = effectiveStatus(a);
        const sb = effectiveStatus(b);
        let oa = order[String(sa).toLowerCase()];
        let ob = order[String(sb).toLowerCase()];
        if (oa == null) oa = 9;
        if (ob == null) ob = 9;
        if (oa !== ob) return oa - ob;
        return number(a.matchDate?.toMillis ? a.matchDate.toMillis() : 0) - number(b.matchDate?.toMillis ? b.matchDate.toMillis() : 0);
    });
}

function SkeletonCard() {
    return (
        <div className="skel-card">
            <div className="skeleton skel-line w60" />
            <div className="skeleton skel-line w40" />
            <div className="skeleton skel-line w85" style={{ marginTop: 16 }} />
        </div>
    );
}

export default function HomePage() {
    const { profile } = useAuth();
    const [tournaments, setTournaments] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(false);

    useEffect(() => {
        document.title = "QREN Esports — Tournaments";
    }, []);

    async function loadTournaments() {
        setLoading(true);
        setError(false);
        try {
            const snap = await db.collection("tournaments").get();
            const list = [];
            snap.forEach(doc => {
                list.push({ ...doc.data(), id: doc.id });
            });
            setTournaments(sortTournaments(list));
        } catch (err) {
            console.error(err);
            setTournaments([]);
            setError(true);
        } finally {
            setLoading(false);
        }
    }

    useEffect(() => {
        loadTournaments();
    }, []);

    const subtitle = loading
        ? "Available matches load ho rahe hain..."
        : tournaments.length
            ? (profile?.userName ? `Hi ${profile.userName}, apna match chuno.` : "Apna match chuno aur Join Tournament dabao.")
            : "Abhi koi match available nahi hai.";

    return (
        <>
            <Topbar sub="Player area" />
            <main className="shell">
                <div className="app-head">
                    <div>
                        <h1>Tournaments</h1>
                        <p id="homeSub">{subtitle}</p>
                    </div>
                </div>

                <div id="tournamentList" className="t-list">
                    {loading ? <><SkeletonCard /><SkeletonCard /></> : tournaments.map(t => {
                        const status = statusInfo(effectiveStatus(t));
                        const total = number(t.totalSlots);
                        const joined = number(t.joinedCount);
                        const remaining = remainingSlots(t);
                        const pct = total > 0 ? Math.min(Math.round((joined / total) * 100), 100) : 0;
                        const imageUrl = safeHttpUrl(t.imageUrl);
                        return (
                            <Link key={t.id} className={"t-card" + (imageUrl ? " has-cover" : "")} to={`/tournament?id=${encodeURIComponent(t.id)}`}>
                                {imageUrl ? (
                                    <span className="t-cover">
                                        <img src={imageUrl} alt="" loading="lazy" decoding="async" onError={e => { e.currentTarget.style.display = "none"; }} />
                                    </span>
                                ) : null}
                                <div className="t-body">
                                    <div className="t-head">
                                        <div>
                                            <div className="t-name">{t.name || "Untitled tournament"}</div>
                                            <div className="t-game"><GameIcon />{t.game || "Game"}</div>
                                        </div>
                                        <span className={"badge " + status.cls}><span className="dot" />{status.label}</span>
                                    </div>
                                    <div className="t-meta">
                                        <div className="hm"><span className="hm-lb">Entry fee</span><strong className="hm-val">{money(t.entryFee)}</strong></div>
                                        <div className="hm"><span className="hm-lb">Prize pool</span><strong className="hm-val prize-pool">{money(t.prizePool)}</strong></div>
                                        <div className="hm"><span className="hm-lb">Match time</span><strong className="hm-val">{fmtTime(t.matchDate) || "TBA"}</strong></div>
                                        <div className="hm"><span className="hm-lb">Slots left</span><strong className="hm-val">{remaining} / {total}</strong></div>
                                    </div>
                                    <div className="slot-bar"><span className={remaining <= 0 ? "full" : ""} style={{ width: `${pct}%` }} /></div>
                                    <div className="t-foot">
                                        <span className="t-slots">
                                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M23 21v-2a4 4 0 0 0-3-3.87" /><path d="M16 3.13a4 4 0 0 1 0 7.75" /></svg>
                                            {joined} joined
                                        </span>
                                        <span className="t-go">Details <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="m9 18 6-6-6-6" /></svg></span>
                                    </div>
                                </div>
                            </Link>
                        );
                    })}
                </div>

                {!loading && !error && tournaments.length === 0 ? (
                    <div className="empty" id="emptyState" style={{ display: "block" }}>
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M8 21h8" /><path d="M12 17v4" /><path d="M7 4h10v5a5 5 0 0 1-10 0Z" /><path d="M7 5H4v2a4 4 0 0 0 4 4" /><path d="M17 5h3v2a4 4 0 0 1-4 4" /></svg>
                        <h3>Abhi koi tournament nahi hai</h3>
                        <p>Admin jab naya tournament add karega, wo yahan turant dikhega.</p>
                    </div>
                ) : null}

                {error ? (
                    <div className="alert danger" id="errorBox" style={{ display: "flex" }}>
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M12 9v4" /><path d="M12 17h.01" /><path d="M10.3 3.9 1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0z" /></svg>
                        <div>
                            <strong>Tournaments load nahi ho paye</strong>
                            <p className="muted" style={{ fontSize: ".78rem" }}>Internet ya Firestore permissions check karo.</p>
                            <button className="btn outline sm" type="button" style={{ marginTop: 8 }} onClick={loadTournaments}>Retry</button>
                        </div>
                    </div>
                ) : null}
            </main>
            <BottomNav active="home" />
        </>
    );
}

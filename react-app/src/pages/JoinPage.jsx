import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { db, FIREBASE_CONFIGURED } from "../lib/firebase";
import { initials, money, toMillis } from "../lib/format";
import { useSettings } from "../context/SettingsContext";
import Topbar from "../components/Topbar";

export default function JoinPage() {
    const settings = useSettings();
    const [players, setPlayers] = useState([]);
    const [search, setSearch] = useState("");
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");

    useEffect(() => {
        document.title = "Tournament Players";
    }, []);

    useEffect(() => {
        if (!FIREBASE_CONFIGURED || !db) {
            setLoading(false);
            setError("Add your project config in firebase-config.js.");
            return;
        }
        let active = true;
        (async () => {
            try {
                const snap = await db.collection("players_public").where("status", "==", "approved").get();
                const list = [];
                snap.forEach(doc => list.push({ ...doc.data(), id: doc.id }));
                list.sort((a, b) => toMillis(b.createdAt) - toMillis(a.createdAt));
                if (active) setPlayers(list);
            } catch (err) {
                console.error(err);
                if (active) setError("Please check your connection and try again.");
            } finally {
                if (active) setLoading(false);
            }
        })();
        return () => { active = false; };
    }, []);

    const filtered = useMemo(() => {
        const term = search.trim().toLowerCase();
        if (!term) return players;
        return players.filter(player =>
            (player.userName || "").toLowerCase().includes(term) ||
            (player.gameIdNumber || "").toLowerCase().includes(term) ||
            (player.gameIdName || "").toLowerCase().includes(term)
        );
    }, [players, search]);

    return (
        <>
            <Topbar sub="Joined players" home="/" actions={
                <Link className="icon-btn" to="/" aria-label="Register">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M12 5v14M5 12h14" /></svg>
                </Link>
            } />
            <main className="shell narrow">
                <section className="hero">
                    <span className="badge success"><span className="dot" />Live roster</span>
                    <h1>Tournament players</h1>
                    <p>All approved players who are locked in for the battle.</p>
                    <div className="hero-meta">
                        <div className="hm"><span className="hm-lb">Registered players</span><strong className="hm-val" id="playerCount">{players.length}</strong></div>
                        <div className="hm"><span className="hm-lb">Entry fee</span><strong className="hm-val">{money(settings.entryFee)}</strong></div>
                        <div className="hm"><span className="hm-lb">Match time</span><strong className="hm-val" data-match>{settings.matchTime || "—"}</strong></div>
                    </div>
                </section>

                {!FIREBASE_CONFIGURED ? (
                    <div className="alert warning setup-warning" id="setupWarning" style={{ display: "flex" }}>
                        <span className="alert-icon">
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M12 9v4" /><path d="M12 17h.01" /><path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" /></svg>
                        </span>
                        <div className="alert-body">
                            <strong className="alert-title">Firebase not configured</strong>
                            <span className="alert-text">Add your project config in firebase-config.js to load players.</span>
                        </div>
                    </div>
                ) : null}

                <div className="search" style={{ marginBottom: 12 }}>
                    <span className="lead" aria-hidden="true">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="7" /><path d="M21 21l-4.35-4.35" /></svg>
                    </span>
                    <input className="input" type="text" placeholder="Search player by name or game ID" id="searchInput" value={search} onChange={e => setSearch(e.target.value)} />
                </div>

                <div className="list" id="playersList" style={{ display: filtered.length ? "flex" : "none" }}>
                    {loading ? <div className="loading">Loading players</div> : filtered.map(player => {
                        const sub = "Game ID: " + (player.gameIdNumber || "—") + (player.gameIdLevel ? " · Level " + player.gameIdLevel : "");
                        return (
                            <article className="row-card" key={player.id}>
                                <span className="avatar">{initials(player.userName)}</span>
                                <div className="row-main">
                                    <p className="row-title">{player.userName}</p>
                                    <p className="row-sub">{sub}</p>
                                </div>
                                <span className="badge success"><span className="dot" />Joined</span>
                            </article>
                        );
                    })}
                </div>

                {!loading && filtered.length === 0 ? (
                    <div className="empty" id="emptyState" style={{ display: "block" }}>
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><circle cx="11" cy="11" r="7" /><path d="M21 21l-4.35-4.35" /></svg>
                        <h3>{error ? "Could not load players" : players.length === 0 ? "No players yet" : "No players found"}</h3>
                        <p>{error || (players.length === 0 ? "Approved players will appear here." : "Try a different search term.")}</p>
                    </div>
                ) : null}
            </main>
            <footer className="site-foot">
                <Link to="/">Register</Link> &nbsp;·&nbsp;
                <Link to="/rule">Rules</Link> &nbsp;·&nbsp;
                <Link to="/admin">Admin</Link>
            </footer>
        </>
    );
}

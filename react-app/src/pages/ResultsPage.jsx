import { useEffect, useState } from "react";
import { db } from "../lib/firebase";
import { fmtDate, money, number, safeHttpUrl, toMillis } from "../lib/format";
import Topbar from "../components/Topbar";
import BottomNav from "../components/BottomNav";
import DetailRow from "../components/DetailRow";
import Overlay from "../components/Overlay";

function SkeletonCard() {
    return (
        <div className="skel-card">
            <div className="skeleton skel-line w60" />
            <div className="skeleton skel-line w40" />
            <div className="skeleton skel-line w85" style={{ marginTop: 16 }} />
        </div>
    );
}

export default function ResultsPage() {
    const [results, setResults] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(false);
    const [selected, setSelected] = useState(null);

    useEffect(() => {
        document.title = "QREN Esports — Results";
    }, []);

    async function loadResults() {
        setLoading(true);
        setError(false);
        try {
            const snap = await db.collection("results").get();
            const list = [];
            snap.forEach(doc => {
                const result = { ...doc.data(), id: doc.id };
                if (String(result.status || "published").toLowerCase() === "published") list.push(result);
            });
            list.sort((a, b) => {
                const diff = toMillis(b.matchDate) - toMillis(a.matchDate);
                if (diff !== 0) return diff;
                return number(a.rank) - number(b.rank);
            });
            setResults(list);
        } catch (err) {
            console.error(err);
            setResults([]);
            setError(true);
        } finally {
            setLoading(false);
        }
    }

    useEffect(() => {
        loadResults();
    }, []);

    return (
        <>
            <Topbar sub="Results" />
            <main className="shell">
                <div className="app-head">
                    <div>
                        <h1>Results</h1>
                        <p>Published winners aur prize details.</p>
                    </div>
                </div>

                <div id="resultList" className="t-list">
                    {loading ? <SkeletonCard /> : results.map(r => {
                        const status = String(r.status || "published").toLowerCase();
                        const badge = status === "published"
                            ? <span className="badge success"><span className="dot" />Published</span>
                            : <span className="badge neutral">{status}</span>;
                        const imageUrl = safeHttpUrl(r.imageUrl);
                        return (
                            <button key={r.id} className={"result-card" + (imageUrl ? " has-cover" : "")} type="button" onClick={() => setSelected(r)}>
                                {imageUrl ? (
                                    <span className="result-cover">
                                        <img src={imageUrl} alt="" loading="lazy" decoding="async" onError={e => { e.currentTarget.style.display = "none"; }} />
                                    </span>
                                ) : null}
                                <div className="result-body">
                                    <div className="result-top">
                                        <div>
                                            <div className="result-title">{r.tournamentName || "Tournament"}</div>
                                            <div className="result-sub">{fmtDate(r.matchDate) || "Date TBA"}{r.game ? ` · ${r.game}` : ""}</div>
                                        </div>
                                        {badge}
                                    </div>
                                    <div className="result-win">
                                        <span>Winner: <strong>{r.winnerName || "—"}</strong></span>
                                        <span className="rank-pill">#{r.rank || "—"}</span>
                                    </div>
                                    <div className="result-win" style={{ borderTop: 0, paddingTop: 4, marginTop: 0 }}>
                                        <span className="muted" style={{ fontSize: ".72rem" }}>Prize won</span>
                                        <span className="prize">{money(r.prize)}</span>
                                    </div>
                                </div>
                            </button>
                        );
                    })}
                </div>

                {!loading && !error && results.length === 0 ? (
                    <div className="empty" id="emptyState" style={{ display: "block" }}>
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M8 21h8" /><path d="M12 17v4" /><path d="M7 4h10v5a5 5 0 0 1-10 0Z" /><path d="M7 5H4v2a4 4 0 0 0 4 4" /><path d="M17 5h3v2a4 4 0 0 1-4 4" /></svg>
                        <h3>Abhi koi result nahi hai</h3>
                        <p>Tournament complete hone ke baad admin yahan winners publish karega.</p>
                    </div>
                ) : null}

                {error ? (
                    <div className="alert danger" id="errorBox" style={{ display: "flex" }}>
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M12 9v4" /><path d="M12 17h.01" /><path d="M10.3 3.9 1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0z" /></svg>
                        <div>
                            <strong>Results load nahi ho paye</strong>
                            <p className="muted" style={{ fontSize: ".78rem" }}>Internet check karke dobara try karo.</p>
                            <button className="btn outline sm" type="button" style={{ marginTop: 8 }} onClick={loadResults}>Retry</button>
                        </div>
                    </div>
                ) : null}
            </main>

            {selected ? (
                <Overlay id="resultModal" onClose={() => setSelected(null)}>
                    <div className="modal-head">
                        <div className="modal-title">
                            <h3 id="resultModalTitle">{selected.tournamentName || "Result"}</h3>
                            <p id="resultModalSub">{fmtDate(selected.matchDate) || "Match result"}</p>
                        </div>
                        <button className="modal-close" type="button" aria-label="Close" onClick={() => setSelected(null)}>
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M18 6 6 18M6 6l12 12" /></svg>
                        </button>
                    </div>
                    <div className="detail-rows" id="resultDetails">
                        <DetailRow label="Tournament" value={selected.tournamentName} />
                        <DetailRow label="Game" value={selected.game} />
                        <DetailRow label="Match date" value={fmtDate(selected.matchDate)} />
                        <DetailRow label="Winner / team" value={selected.winnerName} />
                        <DetailRow label="Rank / position" value={selected.rank} />
                        <DetailRow label="Prize won" value={money(selected.prize)} />
                        <DetailRow label="Result status" value={selected.status ? String(selected.status).charAt(0).toUpperCase() + String(selected.status).slice(1) : "Published"} />
                    </div>
                </Overlay>
            ) : null}
            <BottomNav active="results" />
        </>
    );
}

import { useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import firebase, { db } from "../lib/firebase";
import { toast } from "../lib/toast";
import {
    effectiveStatus, fmtDate, fmtTime, joinBlockReason, money, number, remainingSlots, safeHttpUrl, statusInfo
} from "../lib/format";
import { useAuth } from "../context/AuthContext";
import Topbar from "../components/Topbar";
import BottomNav from "../components/BottomNav";
import DetailRow from "../components/DetailRow";
import Overlay from "../components/Overlay";

function rulesContent(rules) {
    if (!rules) return <p className="prose">Rules abhi add nahi hue.</p>;
    if (Array.isArray(rules)) {
        return rules.map((rule, index) => {
            if (rule && typeof rule === "object") {
                return (
                    <div className="rule-card" key={index}>
                        <p className="rule-title">{rule.title || "Rule"}</p>
                        <p className="rule-desc">{rule.description || ""}</p>
                    </div>
                );
            }
            return <p className="prose" key={index}>{rule}</p>;
        });
    }
    const lines = String(rules).split(/\n+/).filter(line => line.trim());
    if (!lines.length) return <p className="prose">Rules abhi add nahi hue.</p>;
    return lines.map((line, index) => <p className="prose" key={index}>{index + 1}. {line.trim()}</p>);
}

function joinLabel(tournament, joined) {
    if (joined) return "Joined";
    const reason = joinBlockReason(tournament);
    if (!reason) return "Join Tournament";
    const status = String(tournament.status || "").toLowerCase();
    if (status === "cancelled") return "Tournament Cancelled";
    if (status === "completed") return "Tournament Completed";
    if (status === "ongoing") return "Tournament Live";
    if (status === "closed") return "Joining Closed";
    return "Tournament Full";
}

function Skeleton() {
    return (
        <>
            <div className="skel-card">
                <div className="skeleton skel-line w60" />
                <div className="skeleton skel-line w40" />
                <div className="skeleton skel-line w85" style={{ marginTop: 16 }} />
                <div className="skeleton skel-line w85" />
            </div>
            <div className="skel-card">
                <div className="skeleton skel-line w40" />
                <div className="skeleton skel-line w85" />
                <div className="skeleton skel-line w60" />
            </div>
        </>
    );
}

export default function TournamentPage() {
    const [searchParams] = useSearchParams();
    const id = searchParams.get("id") || "";
    const { user, profile, loading: authLoading } = useAuth();
    const [tournament, setTournament] = useState(null);
    const [joined, setJoined] = useState(false);
    const [results, setResults] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [joinModal, setJoinModal] = useState(false);
    const [joining, setJoining] = useState(false);
    const [joinError, setJoinError] = useState("");

    useEffect(() => {
        if (!authLoading && user && profile && id) loadDetails();
        if (!authLoading && !id) {
            setError({ title: "Tournament ID missing", text: "Home page se koi tournament kholo." });
            setLoading(false);
        }
    }, [authLoading, user, profile, id]);

    useEffect(() => {
        if (tournament) document.title = "QREN Esports — " + (tournament.name || "Tournament");
        return () => { document.title = "QREN Esports — Tournament"; };
    }, [tournament]);

    async function loadDetails() {
        setLoading(true);
        setError(null);
        try {
            const snapshot = await db.collection("tournaments").doc(id).get();
            if (!snapshot.exists) {
                setError({ title: "Tournament nahi mila", text: "Ye tournament delete ho gaya hai ya link galat hai." });
                return;
            }

            const data = { ...snapshot.data(), id: snapshot.id };
            const joinSnapshot = await db.collection("joins")
                .where("tournamentId", "==", id)
                .where("userId", "==", user.uid)
                .limit(1)
                .get();
            const isJoined = !joinSnapshot.empty;
            setJoined(isJoined);

            if (isJoined) {
                try {
                    const privateSnapshot = await db.collection("tournament_private").doc(id).get();
                    if (privateSnapshot.exists) Object.assign(data, privateSnapshot.data());
                } catch (privateError) {
                    console.error(privateError);
                }
            } else {
                delete data.roomId;
                delete data.roomPassword;
            }
            setTournament(data);

            const resultsSnapshot = await db.collection("results").where("tournamentId", "==", id).get();
            const resultList = [];
            resultsSnapshot.forEach(doc => {
                const result = { ...doc.data(), id: doc.id };
                if (String(result.status || "published").toLowerCase() === "published") resultList.push(result);
            });
            resultList.sort((a, b) => number(a.rank) - number(b.rank));
            setResults(resultList);
        } catch (err) {
            console.error(err);
            setError({ title: "Tournament load nahi hua", text: "Internet ya Firestore permissions check karo." });
        } finally {
            setLoading(false);
        }
    }

    async function confirmJoin() {
        if (joining || !tournament || !user || !profile) return;
        if (joined) {
            setJoinError("Aap pehle se is tournament me join ho chuke ho.");
            return;
        }

        const joinRef = db.collection("joins").doc(tournament.id + "_" + user.uid);
        const lockRef = db.collection("joinLocks").doc(tournament.id + "_" + user.uid);
        const tournamentRef = db.collection("tournaments").doc(tournament.id);
        setJoining(true);
        setJoinError("");

        try {
            await db.runTransaction(async transaction => {
                const snapshot = await transaction.get(tournamentRef);
                if (!snapshot.exists) throw new Error("not-found");

                const data = snapshot.data();
                const status = String(data.status || "open").toLowerCase();
                const total = Number(data.totalSlots) || 0;
                const count = Number(data.joinedCount) || 0;

                if (["closed", "full", "cancelled", "completed", "ongoing"].includes(status)) throw new Error("closed");
                if (total > 0 && count >= total) throw new Error("full");

                transaction.set(joinRef, {
                    tournamentId: tournament.id,
                    tournamentName: data.name || tournament.name || "",
                    game: data.game || "",
                    matchDate: data.matchDate || null,
                    entryFee: data.entryFee || 0,
                    prizePool: data.prizePool || "",
                    userId: user.uid,
                    userName: profile.userName || user.displayName || "Player",
                    mobile: profile.mobile || "",
                    status: "joined",
                    joinedAt: firebase.firestore.FieldValue.serverTimestamp()
                });

                transaction.set(lockRef, {
                    tournamentId: tournament.id,
                    userId: user.uid,
                    counted: true,
                    createdAt: firebase.firestore.FieldValue.serverTimestamp()
                });

                transaction.update(tournamentRef, {
                    joinedCount: count + 1,
                    status: total > 0 && count + 1 >= total ? "full" : (data.status || "open")
                });
            });

            setJoinModal(false);
            toast("Tournament joined successfully", "success");
            setJoined(true);
            await loadDetails();
        } catch (err) {
            console.error(err);
            const code = err?.message;
            if (code === "full") setJoinError("Saari slots bhar chuki hain.");
            else if (code === "closed") setJoinError("Is tournament ke liye joining band hai.");
            else if (code === "not-found") setJoinError("Tournament ab available nahi hai.");
            else if (err?.code === "permission-denied") setJoinError("Aap pehle se join ho chuke ho ya joining ab available nahi hai.");
            else setJoinError("Join nahi ho paya. Internet check karke dobara try karo.");
        } finally {
            setJoining(false);
        }
    }

    if (authLoading || (!!user && !profile && !error)) {
        return (
            <>
                <Topbar sub="Tournament details" />
                <main className="shell"><Skeleton /></main>
                <BottomNav active="home" />
            </>
        );
    }

    if (user && !profile) {
        return (
            <>
                <Topbar sub="Tournament details" />
                <main className="shell">
                    <div className="alert danger" style={{ display: "flex" }}>
                        <div>
                            <strong>Profile load nahi hua</strong>
                            <p className="muted" style={{ fontSize: ".78rem" }}>Aapka account data nahi mila. Logout karke dobara login karo.</p>
                            <Link className="btn outline sm" style={{ marginTop: 8 }} to="/home">Back to tournaments</Link>
                        </div>
                    </div>
                </main>
                <BottomNav active="home" />
            </>
        );
    }

    const status = tournament ? statusInfo(effectiveStatus(tournament)) : null;
    const total = tournament ? number(tournament.totalSlots) : 0;
    const joinedCount = tournament ? number(tournament.joinedCount) : 0;
    const remaining = tournament ? remainingSlots(tournament) : 0;
    const pct = total > 0 ? Math.min(Math.round((joinedCount / total) * 100), 100) : 0;
    const imageUrl = safeHttpUrl(tournament?.imageUrl);
    const blockReason = tournament ? joinBlockReason(tournament) : "";
    const hasRoom = tournament?.roomId || tournament?.roomPassword;

    return (
        <>
            <Topbar sub="Tournament details" />
            <main className="shell">
                <div className="app-head">
                    <div>
                        <h1 id="tName">{tournament?.name || "Tournament"}</h1>
                        <p id="tGame">{tournament ? `${tournament.game || "Game"} · ${fmtTime(tournament.matchDate)}` : "Details load ho rahe hain..."}</p>
                    </div>
                    <Link className="head-action" to="/home">&larr; Tournaments</Link>
                </div>

                <div id="detailContent">
                    {loading ? <Skeleton /> : tournament ? (
                        <>
                            <section className={"detail-hero" + (imageUrl ? " has-cover" : "")}>
                                {imageUrl ? (
                                    <span className="detail-cover">
                                        <img src={imageUrl} alt="" loading="lazy" decoding="async" onError={e => { e.currentTarget.style.display = "none"; }} />
                                    </span>
                                ) : null}
                                <span className={"badge " + status.cls}><span className="dot" />{status.label}</span>
                                <h1>{tournament.name || "Tournament"}</h1>
                                <div className="game-line"><span>{tournament.game || "Game"}</span><span>·</span><span>{fmtTime(tournament.matchDate) || "Time TBA"}</span></div>
                                <div className="detail-price">
                                    <div className="fee"><small>Entry fee</small>{money(tournament.entryFee)}</div>
                                    <div className="prize prize-pool"><small>Prize pool</small>{money(tournament.prizePool)}</div>
                                </div>
                                <div className="slot-bar" style={{ marginTop: 16 }}><span className={remaining <= 0 ? "full" : ""} style={{ width: `${pct}%` }} /></div>
                                <div className="t-foot" style={{ borderTop: 0, marginTop: 6, paddingTop: 0 }}>
                                    <span className="t-slots">{remaining} / {total} slots left</span>
                                    <span className="muted">{joinedCount} joined</span>
                                </div>
                            </section>

                            <div className="detail-grid">
                                <div className="dg"><span>Match date</span><strong>{fmtDate(tournament.matchDate) || "TBA"}</strong></div>
                                <div className="dg"><span>Match time</span><strong>{fmtTime(tournament.matchDate) || "TBA"}</strong></div>
                                <div className="dg"><span>Total slots</span><strong>{total}</strong></div>
                                <div className="dg"><span>Slots left</span><strong>{remaining}</strong></div>
                                <div className="dg"><span>Match format</span><strong>{tournament.matchFormat || "—"}</strong></div>
                                <div className="dg"><span>Status</span><strong>{status.label}</strong></div>
                            </div>

                            <div className="detail-block"><h2>About this tournament</h2><p className="prose">{tournament.description || "Description abhi add nahi hui."}</p></div>

                            {tournament.prizeDistribution ? <div className="detail-block"><h2>Prize distribution</h2><p className="prose">{tournament.prizeDistribution}</p></div> : null}

                            <div className="detail-block"><h2>Tournament rules</h2>{rulesContent(tournament.rules)}</div>

                            <div className="detail-block">
                                <h2>Room details</h2>
                                {!joined ? (
                                    <div className="room-locked">
                                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><rect x="3" y="11" width="18" height="11" rx="2" /><path d="M7 11V7a5 5 0 0 1 10 0v4" /></svg>
                                        <span>Room ID aur password sirf joined players ko dikhte hain.</span>
                                    </div>
                                ) : !hasRoom ? (
                                    <p className="prose">Organizer ne abhi room details release nahi ki.</p>
                                ) : (
                                    <div className="room-box">
                                        <div><span className="hm-lb">Room ID</span><p className="room-val">{tournament.roomId || "—"}</p></div>
                                        <div><span className="hm-lb">Password</span><p className="room-val">{tournament.roomPassword || "—"}</p></div>
                                    </div>
                                )}
                            </div>

                            <div className="detail-block">
                                <h2>Results &amp; winners</h2>
                                {!results.length ? <p className="prose">Result abhi publish nahi hua.</p> : results.map(result => (
                                    <div className="result-win" key={result.id}>
                                        <span><span className="rank-pill">#{result.rank || "—"}</span> <strong>{result.winnerName || "Winner"}</strong></span>
                                        <span className="prize">{money(result.prize)}</span>
                                    </div>
                                ))}
                            </div>
                        </>
                    ) : null}
                </div>

                {error ? (
                    <div className="alert danger" id="errorBox" style={{ display: "flex" }}>
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M12 9v4" /><path d="M12 17h.01" /><path d="M10.3 3.9 1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0z" /></svg>
                        <div>
                            <strong id="errorTitle">{error.title}</strong>
                            <p className="muted" style={{ fontSize: ".78rem" }} id="errorText">{error.text}</p>
                            <Link className="btn outline sm" style={{ marginTop: 8 }} to="/home">Back to tournaments</Link>
                        </div>
                    </div>
                ) : null}

                {tournament && !loading ? (
                    <div className="sticky-action" id="joinBar">
                        <button className={"btn lg full " + (joined ? "success" : "primary")} type="button" id="joinBtn"
                            disabled={joined || !!blockReason}
                            onClick={() => {
                                setJoinError("");
                                setJoinModal(true);
                            }}>
                            {joinLabel(tournament, joined)}
                        </button>
                    </div>
                ) : null}
            </main>

            {joinModal && tournament ? (
                <Overlay id="joinModal" onClose={() => !joining && setJoinModal(false)}>
                    <div className="modal-head">
                        <div className="modal-title">
                            <h3 id="joinModalTitle">Confirm joining</h3>
                            <p>Entry ek baar confirm karne ke baad slot book ho jayega.</p>
                        </div>
                        <button className="modal-close" type="button" aria-label="Close" onClick={() => !joining && setJoinModal(false)}>
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M18 6 6 18M6 6l12 12" /></svg>
                        </button>
                    </div>
                    <div className="detail-rows" id="joinSummary">
                        <DetailRow label="Tournament" value={tournament.name} />
                        <DetailRow label="Game" value={tournament.game} />
                        <DetailRow label="Entry fee" value={money(tournament.entryFee)} />
                        <DetailRow label="Match" value={fmtTime(tournament.matchDate)} />
                        <DetailRow label="Slots left" value={`${remainingSlots(tournament)} / ${number(tournament.totalSlots)}`} />
                    </div>
                    <p className="section-label">Your entry details</p>
                    <div className="detail-rows" id="joinUserDetails">
                        <DetailRow label="Player name" value={profile?.userName || user?.displayName || "Player"} />
                        <DetailRow label="Mobile number" value={profile?.mobile} />
                    </div>
                    {joinError ? (
                        <div className="alert danger" id="joinError" style={{ display: "flex", marginTop: 12 }}>
                            <span id="joinErrorText">{joinError}</span>
                        </div>
                    ) : null}
                    <div className="modal-actions">
                        <button className="btn outline sm" type="button" disabled={joining} onClick={() => setJoinModal(false)}>Cancel</button>
                        <button className={"btn primary sm" + (joining ? " loading" : "")} type="button" id="confirmJoinBtn" disabled={joining} onClick={confirmJoin}>
                            {joining ? <><span className="spin" aria-hidden="true" />Joining...</> : "Confirm Join"}
                        </button>
                    </div>
                </Overlay>
            ) : null}
            <BottomNav active="home" />
        </>
    );
}

import { useEffect, useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";
import firebase, { auth, db, BOOTSTRAP_ADMIN_UIDS } from "../lib/firebase";
import { fetchPrivateSettings, fetchSettings } from "../lib/settings";
import { fmtTime, initials, money, number, safeHttpUrl, timestampToInput, toMillis } from "../lib/format";
import { toast } from "../lib/toast";
import Overlay from "../components/Overlay";
import DetailRow from "../components/DetailRow";

const ADMIN_LOGO = `${import.meta.env.BASE_URL}admin/icons/qren-logo.png`;

const EMPTY_TOURNAMENT = {
    name: "",
    game: "",
    imageUrl: "",
    entryFee: "0",
    prizePool: "",
    totalSlots: "48",
    matchDate: "",
    status: "open",
    matchFormat: "",
    roomId: "",
    roomPassword: "",
    description: "",
    prizeDistribution: "",
    rules: ""
};

function paymentStatusBadge(status) {
    if (status === "approved") return <span className="badge success"><span className="dot" />Approved</span>;
    if (status === "rejected") return <span className="badge danger"><span className="dot" />Rejected</span>;
    return <span className="badge warning"><span className="dot" />Pending</span>;
}

function tStatus(status) {
    const value = String(status || "").toLowerCase();
    const map = {
        open: { label: "Open", cls: "success" },
        upcoming: { label: "Upcoming", cls: "info" },
        full: { label: "Full", cls: "warning" },
        ongoing: { label: "Live", cls: "info" },
        completed: { label: "Completed", cls: "neutral" },
        cancelled: { label: "Cancelled", cls: "danger" },
        closed: { label: "Closed", cls: "neutral" }
    };
    return map[value] || { label: value || "Unknown", cls: "neutral" };
}

function publicPlayerData(player) {
    return {
        userName: player.userName || "",
        gameIdName: player.gameIdName || "",
        gameIdNumber: player.gameIdNumber || "",
        gameIdLevel: player.gameIdLevel || "",
        status: player.status || "approved",
        addedByAdmin: !!player.addedByAdmin,
        createdAt: player.createdAt || firebase.firestore.FieldValue.serverTimestamp()
    };
}

function AdminGate({ message, busy, onLogin }) {
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");

    function submit(event) {
        event.preventDefault();
        onLogin(email.trim(), password);
    }

    return (
        <div className="admin-gate" id="adminGate">
            <div className="admin-login-card">
                <span className="brand-mark"><img src={ADMIN_LOGO} alt="QREN Esports logo" /></span>
                <h1>Admin login</h1>
                <p className="muted">Sirf authorized admin account access kar sakta hai.</p>
                <form id="adminLoginForm" noValidate onSubmit={submit}>
                    <div className="field">
                        <label className="field-label" htmlFor="adminEmail">Admin email</label>
                        <input className="input" type="email" id="adminEmail" autoComplete="username" placeholder="admin@example.com" value={email} onChange={e => setEmail(e.target.value)} />
                    </div>
                    <div className="field">
                        <label className="field-label" htmlFor="adminPassword">Password</label>
                        <input className="input" type="password" id="adminPassword" autoComplete="current-password" placeholder="Your password" value={password} onChange={e => setPassword(e.target.value)} />
                    </div>
                    {message ? (
                        <div className="alert danger" id="adminLoginError" style={{ display: "flex", marginBottom: 14 }}>
                            <span id="adminLoginErrorText">{message}</span>
                        </div>
                    ) : null}
                    <button className={"btn primary full" + (busy ? " loading" : "")} type="submit" id="adminLoginBtn" disabled={busy}>
                        {busy ? <><span className="spin" aria-hidden="true" />Checking...</> : "Login"}
                    </button>
                </form>
                <p className="help" style={{ marginTop: 14 }}>Admin account Firebase Authentication me hona chahiye, aur <code>admins/{`{UID}`}</code> doc Firestore me.</p>
            </div>
        </div>
    );
}

function PanelHead({ title, sub }) {
    return (
        <div className="panel-head">
            <div>
                <h2 className="panel-title">{title}</h2>
                <p className="panel-sub">{sub}</p>
            </div>
        </div>
    );
}

function EmptyState({ id, icon, title, text }) {
    return (
        <div className="empty" id={id} style={{ display: "block" }}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">{icon}</svg>
            <h3>{title}</h3>
            <p>{text}</p>
        </div>
    );
}

export default function AdminPage() {
    const [adminUser, setAdminUser] = useState(undefined);
    const [gateMessage, setGateMessage] = useState("");
    const [loginBusy, setLoginBusy] = useState(false);
    const [tab, setTab] = useState("players");
    const [settings, setSettings] = useState(null);
    const [players, setPlayers] = useState([]);
    const [users, setUsers] = useState([]);
    const [tournaments, setTournaments] = useState([]);
    const [results, setResults] = useState([]);
    const [search, setSearch] = useState("");
    const [emailSearch, setEmailSearch] = useState("");
    const [filter, setFilter] = useState("all");
    const [selectedPlayer, setSelectedPlayer] = useState(null);
    const [editId, setEditId] = useState(null);
    const [editForm, setEditForm] = useState({ name: "", gameNumber: "", gameName: "", gameLevel: "" });
    const [addForm, setAddForm] = useState({ name: "", gameNumber: "" });
    const [editingTournamentId, setEditingTournamentId] = useState(null);
    const [tournamentForm, setTournamentForm] = useState(EMPTY_TOURNAMENT);
    const [resultForm, setResultForm] = useState({ tournament: "", winner: "", rank: "1", prize: "", status: "published" });
    const [settingsForm, setSettingsForm] = useState({ entryFee: 0, referralReward: 0, upiId: "", qrUrl: "", telegramBotToken: "", telegramChatId: "" });
    const [rules, setRules] = useState([]);
    const [newRule, setNewRule] = useState({ title: "", description: "" });
    const [savingTournament, setSavingTournament] = useState(false);
    const tournamentPanel = useRef(null);

    const privatePlayers = useMemo(() => players.filter(player => !player.addedByAdmin), [players]);
    const joinedPlayers = useMemo(() => players.filter(player => player.addedByAdmin), [players]);
    const stats = useMemo(() => {
        let pending = 0;
        let approved = 0;
        let rejected = 0;
        privatePlayers.forEach(player => {
            if (player.status === "pending") pending++;
            else if (player.status === "approved") approved++;
            else if (player.status === "rejected") rejected++;
        });
        return { total: privatePlayers.length, pending, approved, rejected };
    }, [privatePlayers]);

    useEffect(() => {
        document.body.classList.toggle("admin-locked", !adminUser);
        return () => document.body.classList.remove("admin-locked");
    }, [adminUser]);

    useEffect(() => {
        document.title = "Admin Panel";
        if (!auth) {
            setAdminUser(null);
            setGateMessage("Firebase Auth load nahi hua. Page reload karo.");
            return undefined;
        }

        async function handleAdminUser(user) {
            if (!user) {
                setAdminUser(null);
                return;
            }
            try {
                const adminSnap = await db.collection("admins").doc(user.uid).get();
                const allowlisted = BOOTSTRAP_ADMIN_UIDS.includes(user.uid);
                if (!adminSnap.exists && !allowlisted) {
                    setGateMessage("Ye account admin nahi hai. Firestore me admins/" + user.uid + " doc banao.");
                    await auth.signOut();
                    setAdminUser(null);
                    return;
                }
                if (!adminSnap.exists && allowlisted) {
                    try {
                        await db.collection("settings").doc("private").get();
                    } catch (checkError) {
                        if (checkError?.code === "permission-denied") {
                            setGateMessage("Admin UID code me allowlisted hai, lekin Firestore rules purane hain. Updated firestore.rules paste karke Publish karo.");
                            await auth.signOut();
                            setAdminUser(null);
                            return;
                        }
                        throw checkError;
                    }
                }
                setGateMessage("");
                setAdminUser(user);
            } catch (err) {
                console.error(err);
                setGateMessage("Admin verify nahi ho paya. Firestore rules aur internet check karo.");
                setAdminUser(null);
            }
        }

        return auth.onAuthStateChanged(handleAdminUser, () => {
            setAdminUser(null);
            setGateMessage("Auth check nahi ho paya. Page reload karo.");
        });
    }, []);

    async function login(email, password) {
        if (!email || !password) {
            setGateMessage("Email aur password dono daalo.");
            return;
        }
        setLoginBusy(true);
        setGateMessage("");
        try {
            await auth.signInWithEmailAndPassword(email, password);
        } catch (err) {
            console.error(err);
            let message = "Login nahi ho paya. Email/password check karo.";
            if (err?.code === "auth/too-many-requests") message = "Bahut attempts ho gaye. Thodi der baad try karo.";
            if (err?.code === "auth/network-request-failed") message = "Internet connection check karo.";
            setGateMessage(message);
        } finally {
            setLoginBusy(false);
        }
    }

    async function adminLogout() {
        setGateMessage("");
        await auth.signOut();
        setAdminUser(null);
    }

    useEffect(() => {
        if (!adminUser) return undefined;
        let active = true;
        let unsubUsers;
        let unsubPlayers;
        let unsubTournaments;
        let unsubResults;

        (async () => {
            const publicSettings = await fetchSettings(true);
            const privateSettings = await fetchPrivateSettings();
            if (!active) return;
            const merged = { ...publicSettings, ...privateSettings };
            setSettings(merged);
            setSettingsForm({
                entryFee: merged.entryFee || 0,
                referralReward: merged.referralReward || 0,
                upiId: merged.upiId || "",
                qrUrl: merged.qrUrl || "",
                telegramBotToken: merged.telegramBotToken || "",
                telegramChatId: merged.telegramChatId || ""
            });
            setRules(Array.isArray(merged.rules) ? merged.rules : []);
        })();

        unsubUsers = db.collection("users").onSnapshot(snapshot => {
            const list = [];
            snapshot.forEach(doc => list.push({ ...doc.data(), id: doc.id }));
            list.sort((a, b) => toMillis(b.emailVerificationRequestedAt) - toMillis(a.emailVerificationRequestedAt));
            if (active) setUsers(list);
        }, err => {
            console.error(err);
            if (active) toast("Error loading emails", "danger");
        });

        unsubPlayers = db.collection("players_private").onSnapshot(snapshot => {
            const list = [];
            snapshot.forEach(doc => list.push({ ...doc.data(), id: doc.id }));
            list.sort((a, b) => toMillis(b.createdAt) - toMillis(a.createdAt));
            if (active) setPlayers(list);
        }, err => {
            console.error(err);
            if (active) toast("Error loading players", "danger");
        });

        unsubTournaments = db.collection("tournaments").onSnapshot(snapshot => {
            const list = [];
            snapshot.forEach(doc => list.push({ ...doc.data(), id: doc.id }));
            list.sort((a, b) => toMillis(b.matchDate) - toMillis(a.matchDate));
            if (active) setTournaments(list);
        }, err => {
            console.error(err);
            if (active) toast("Error loading tournaments", "danger");
        });

        unsubResults = db.collection("results").onSnapshot(snapshot => {
            const list = [];
            snapshot.forEach(doc => list.push({ ...doc.data(), id: doc.id }));
            list.sort((a, b) => {
                const diff = toMillis(b.createdAt) - toMillis(a.createdAt);
                return diff !== 0 ? diff : toMillis(b.matchDate) - toMillis(a.matchDate);
            });
            if (active) setResults(list);
        }, err => {
            console.error(err);
            if (active) toast("Error loading results", "danger");
        });

        if ("serviceWorker" in navigator) {
            navigator.serviceWorker.register(`${import.meta.env.BASE_URL}admin/sw.js`).catch(() => {});
        }

        return () => {
            active = false;
            unsubUsers?.();
            unsubPlayers?.();
            unsubTournaments?.();
            unsubResults?.();
        };
    }, [adminUser]);

    useEffect(() => {
        if (!adminUser) return undefined;
        const link = document.createElement("link");
        link.rel = "manifest";
        link.href = `${import.meta.env.BASE_URL}admin/manifest.json`;
        link.id = "admin-manifest";
        document.head.appendChild(link);
        return () => link.remove();
    }, [adminUser]);

    const filteredPayments = useMemo(() => {
        const term = search.trim().toLowerCase();
        return privatePlayers.filter(player => {
            if (filter !== "all" && player.status !== filter) return false;
            if (!term) return true;
            return [player.userName, player.gameIdNumber, player.mobileNumber, player.utrNumber]
                .some(value => String(value || "").toLowerCase().includes(term));
        });
    }, [privatePlayers, filter, search]);

    const filteredEmails = useMemo(() => {
        const term = emailSearch.trim().toLowerCase();
        return users.filter(user => {
            if (!user.email) return false;
            if (!term) return true;
            return [user.userName, user.email, user.userId].some(value => String(value || "").toLowerCase().includes(term));
        });
    }, [users, emailSearch]);

    function findPlayer(id) {
        return players.find(player => player.id === id);
    }

    function findTournament(id) {
        return tournaments.find(tournament => tournament.id === id);
    }

    async function syncPublicPlayer(id, player) {
        const ref = db.collection("players_public").doc(id);
        if (String(player.status || "") === "approved") await ref.set(publicPlayerData(player), { merge: true });
        else await ref.delete();
    }

    async function setPlayerStatus(id, status) {
        try {
            const player = findPlayer(id);
            if (!player) throw new Error("player-not-found");
            await db.collection("players_private").doc(id).update({ status });
            player.status = status;
            await syncPublicPlayer(id, player);
            toast("Player " + status, status === "approved" ? "success" : "danger");
            setSelectedPlayer(null);
        } catch (err) {
            console.error(err);
            toast("Error updating player", "danger");
        }
    }

    async function deletePlayer(id) {
        if (!window.confirm("Delete this player? This cannot be undone.")) return;
        try {
            const batch = db.batch();
            batch.delete(db.collection("players_private").doc(id));
            batch.delete(db.collection("players_public").doc(id));
            await batch.commit();
            toast("Player deleted");
            setSelectedPlayer(null);
            setEditId(null);
        } catch (err) {
            console.error(err);
            toast("Error deleting player", "danger");
        }
    }

    async function addPlayer() {
        const name = addForm.name.trim();
        if (!name) {
            toast("Enter user name", "danger");
            return;
        }
        try {
            const ref = db.collection("players_private").doc();
            const player = {
                userName: name,
                gameIdNumber: addForm.gameNumber.trim(),
                status: "approved",
                addedByAdmin: true,
                createdAt: firebase.firestore.FieldValue.serverTimestamp()
            };
            const batch = db.batch();
            batch.set(ref, player);
            batch.set(db.collection("players_public").doc(ref.id), publicPlayerData(player));
            await batch.commit();
            setAddForm({ name: "", gameNumber: "" });
            toast("Player added", "success");
        } catch (err) {
            console.error(err);
            toast("Error adding player", "danger");
        }
    }

    function openEditPlayer(id) {
        const player = findPlayer(id);
        if (!player) return;
        setEditId(id);
        setEditForm({
            name: player.userName || "",
            gameNumber: player.gameIdNumber || "",
            gameName: player.gameIdName || "",
            gameLevel: player.gameIdLevel || ""
        });
    }

    async function saveEditPlayer() {
        const name = editForm.name.trim();
        if (!name) {
            toast("Enter user name", "danger");
            return;
        }
        try {
            const player = findPlayer(editId);
            if (!player) throw new Error("player-not-found");
            const patch = {
                userName: name,
                gameIdNumber: editForm.gameNumber.trim(),
                gameIdName: editForm.gameName.trim(),
                gameIdLevel: editForm.gameLevel.trim()
            };
            await db.collection("players_private").doc(editId).update(patch);
            Object.assign(player, patch);
            await syncPublicPlayer(editId, player);
            setEditId(null);
            toast("Player updated", "success");
        } catch (err) {
            console.error(err);
            toast("Error updating player", "danger");
        }
    }

    async function verifyEmail(uid) {
        try {
            await db.collection("users").doc(uid).update({ emailVerified: true });
            toast("Email verified", "success");
        } catch (err) {
            console.error(err);
            toast(err?.code === "permission-denied" ? "Firestore rules update publish karo" : "Email verify nahi hua", "danger");
        }
    }

    function updateTournament(field, value) {
        setTournamentForm(prev => ({ ...prev, [field]: value }));
    }

    function clearTournamentForm() {
        setEditingTournamentId(null);
        setTournamentForm(EMPTY_TOURNAMENT);
    }

    async function editTournament(id) {
        const tournament = findTournament(id);
        if (!tournament) return;
        try {
            const privateSnap = await db.collection("tournament_private").doc(id).get();
            if (privateSnap.exists) Object.assign(tournament, privateSnap.data());
        } catch (err) {
            console.error(err);
        }
        setEditingTournamentId(id);
        setTournamentForm({
            name: tournament.name || "",
            game: tournament.game || "",
            imageUrl: tournament.imageUrl || "",
            entryFee: String(Number(tournament.entryFee) || 0),
            prizePool: tournament.prizePool || "",
            totalSlots: String(Number(tournament.totalSlots) || 1),
            matchDate: timestampToInput(tournament.matchDate),
            status: tournament.status || "open",
            matchFormat: tournament.matchFormat || "",
            roomId: tournament.roomId || "",
            roomPassword: tournament.roomPassword || "",
            description: tournament.description || "",
            prizeDistribution: tournament.prizeDistribution || "",
            rules: Array.isArray(tournament.rules)
                ? tournament.rules.map(rule => rule.title ? rule.title + ": " + (rule.description || "") : rule).join("\n")
                : (tournament.rules || "")
        });
        tournamentPanel.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    }

    async function saveTournament() {
        const name = tournamentForm.name.trim();
        const game = tournamentForm.game.trim();
        const slots = Number(tournamentForm.totalSlots);
        const dateValue = tournamentForm.matchDate;
        const imageRaw = tournamentForm.imageUrl.trim();
        const imageUrl = imageRaw ? safeHttpUrl(imageRaw) : "";

        if (!name) return toast("Tournament name daalo", "danger");
        if (!game) return toast("Game name daalo", "danger");
        if (imageRaw && !imageUrl) return toast("Image URL http:// ya https:// se start hona chahiye", "danger");
        if (!slots || slots < 1) return toast("Total slots 1 ya zyada rakho", "danger");
        if (!dateValue) return toast("Match date aur time select karo", "danger");

        const date = new Date(dateValue);
        if (Number.isNaN(date.getTime())) return toast("Match date valid nahi hai", "danger");

        const existing = editingTournamentId ? findTournament(editingTournamentId) : null;
        const tournamentRef = editingTournamentId ? db.collection("tournaments").doc(editingTournamentId) : db.collection("tournaments").doc();
        const payload = {
            name,
            game,
            imageUrl,
            entryFee: Number(tournamentForm.entryFee) || 0,
            prizePool: tournamentForm.prizePool.trim(),
            totalSlots: slots,
            joinedCount: existing ? (Number(existing.joinedCount) || 0) : 0,
            matchDate: firebase.firestore.Timestamp.fromDate(date),
            status: tournamentForm.status || "open",
            matchFormat: tournamentForm.matchFormat.trim(),
            description: tournamentForm.description.trim(),
            prizeDistribution: tournamentForm.prizeDistribution.trim(),
            rules: tournamentForm.rules.trim(),
            updatedAt: firebase.firestore.FieldValue.serverTimestamp()
        };
        if (!editingTournamentId) payload.createdAt = firebase.firestore.FieldValue.serverTimestamp();
        const privatePayload = {
            tournamentId: tournamentRef.id,
            roomId: tournamentForm.roomId.trim(),
            roomPassword: tournamentForm.roomPassword.trim(),
            updatedAt: firebase.firestore.FieldValue.serverTimestamp()
        };

        setSavingTournament(true);
        try {
            const batch = db.batch();
            batch.set(tournamentRef, payload, { merge: true });
            batch.set(db.collection("tournament_private").doc(tournamentRef.id), privatePayload, { merge: true });
            await batch.commit();
            toast(editingTournamentId ? "Tournament updated" : "Tournament added", "success");
            clearTournamentForm();
        } catch (err) {
            console.error(err);
            toast("Error saving tournament", "danger");
        } finally {
            setSavingTournament(false);
        }
    }

    async function deleteTournament(id) {
        if (!window.confirm("Delete this tournament? Iske joins aur results bhi delete ho jayenge.")) return;
        try {
            const [joinsSnap, resultsSnap, locksSnap] = await Promise.all([
                db.collection("joins").where("tournamentId", "==", id).get(),
                db.collection("results").where("tournamentId", "==", id).get(),
                db.collection("joinLocks").where("tournamentId", "==", id).get()
            ]);
            const batch = db.batch();
            joinsSnap.forEach(doc => batch.delete(doc.ref));
            resultsSnap.forEach(doc => batch.delete(doc.ref));
            locksSnap.forEach(doc => batch.delete(doc.ref));
            batch.delete(db.collection("tournament_private").doc(id));
            batch.delete(db.collection("tournaments").doc(id));
            await batch.commit();
            if (editingTournamentId === id) clearTournamentForm();
            toast("Tournament deleted", "success");
        } catch (err) {
            console.error(err);
            toast("Error deleting tournament", "danger");
        }
    }

    async function publishResult() {
        const tournament = findTournament(resultForm.tournament);
        const winner = resultForm.winner.trim();
        if (!tournament) return toast("Tournament select karo", "danger");
        if (!winner) return toast("Winner name daalo", "danger");
        try {
            await db.collection("results").add({
                tournamentId: tournament.id,
                tournamentName: tournament.name || "Tournament",
                game: tournament.game || "",
                imageUrl: tournament.imageUrl || "",
                matchDate: tournament.matchDate || null,
                winnerName: winner,
                rank: Number(resultForm.rank) || 1,
                prize: resultForm.prize.trim(),
                status: resultForm.status || "published",
                createdAt: firebase.firestore.FieldValue.serverTimestamp()
            });
            setResultForm(prev => ({ ...prev, winner: "", rank: "1", prize: "" }));
            toast("Result published", "success");
        } catch (err) {
            console.error(err);
            toast("Error publishing result", "danger");
        }
    }

    async function deleteResult(id) {
        if (!window.confirm("Delete this result entry?")) return;
        try {
            await db.collection("results").doc(id).delete();
            toast("Result deleted", "success");
        } catch (err) {
            console.error(err);
            toast("Error deleting result", "danger");
        }
    }

    async function saveSettings() {
        if (!settings) return;
        const publicUpdate = {
            entryFee: Number(settingsForm.entryFee) || 0,
            referralReward: Number(settingsForm.referralReward) || 0,
            upiId: settingsForm.upiId.trim(),
            qrUrl: settingsForm.qrUrl.trim()
        };
        const privateUpdate = {
            telegramBotToken: settingsForm.telegramBotToken.trim(),
            telegramChatId: settingsForm.telegramChatId.trim()
        };
        const publicPayload = { ...settings, ...publicUpdate };
        delete publicPayload.telegramBotToken;
        delete publicPayload.telegramChatId;
        try {
            const batch = db.batch();
            batch.set(db.collection("settings").doc("public"), publicPayload, { merge: true });
            batch.set(db.collection("settings").doc("private"), privateUpdate, { merge: true });
            await batch.commit();
            setSettings(prev => ({ ...prev, ...publicUpdate, ...privateUpdate }));
            toast("Settings saved", "success");
        } catch (err) {
            console.error(err);
            toast("Error saving settings", "danger");
        }
    }

    async function persistRules(nextRules) {
        try {
            await db.collection("settings").doc("public").set({ rules: nextRules }, { merge: true });
            setSettings(prev => ({ ...prev, rules: nextRules }));
            setRules(nextRules);
            toast("Rules updated", "success");
        } catch (err) {
            console.error(err);
            toast("Error saving rules", "danger");
        }
    }

    function updateRule(index, field, value) {
        setRules(prev => prev.map((rule, i) => i === index ? { ...rule, [field]: value } : rule));
    }

    async function deleteRule(index) {
        if (!window.confirm("Delete this rule?")) return;
        const next = rules.slice();
        next.splice(index, 1);
        await persistRules(next);
    }

    async function addRule() {
        const title = newRule.title.trim();
        const description = newRule.description.trim();
        if (!title || !description) return toast("Fill title and description", "danger");
        await persistRules([...rules, { title, description }]);
        setNewRule({ title: "", description: "" });
    }

    if (!adminUser) {
        return <AdminGate message={gateMessage} busy={loginBusy} onLogin={login} />;
    }

    const tournamentName = settings?.tournamentName || "QREN Esports";

    return (
        <>
            <header className="topbar">
                <div className="topbar-inner">
                    <Link className="brand" to="/">
                        <span className="brand-mark"><img src={ADMIN_LOGO} alt="QREN Esports logo" /></span>
                        <span>
                            <strong className="brand-name" data-tournament-name>{tournamentName}</strong>
                            <span className="brand-sub">Admin panel</span>
                        </span>
                    </Link>
                    <div className="topbar-actions">
                        <span className="badge info" id="adminBadge" style={{ display: "inline-flex" }}>{adminUser.email || "Admin"}</span>
                        <button className="icon-btn" type="button" onClick={() => window.location.reload()} aria-label="Refresh data">
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M21 12a9 9 0 1 1-2.64-6.36" /><path d="M21 3v6h-6" /></svg>
                        </button>
                        <button className="icon-btn" type="button" onClick={adminLogout} aria-label="Logout">
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" /><path d="m16 17 5-5-5-5" /><path d="M21 12H9" /></svg>
                        </button>
                    </div>
                </div>
            </header>

            <main className="shell">
                <div className="page-head" style={{ marginBottom: 16 }}>
                    <h1 id="panelTitle">{tournamentName} — Admin</h1>
                    <p className="muted">Manage registrations, payments, rules and tournament settings.</p>
                </div>

                <div className="stat-grid">
                    <div className="stat"><p className="stat-lb">Total</p><p className="stat-val" id="statTotal">{stats.total}</p></div>
                    <div className="stat"><p className="stat-lb">Pending</p><p className="stat-val pending" id="statPending">{stats.pending}</p></div>
                    <div className="stat"><p className="stat-lb">Approved</p><p className="stat-val approved" id="statApproved">{stats.approved}</p></div>
                    <div className="stat"><p className="stat-lb">Rejected</p><p className="stat-val rejected" id="statRejected">{stats.rejected}</p></div>
                </div>

                <div className="tabs" role="tablist" aria-label="Admin sections">
                    {[
                        ["players", "Players"], ["emails", "Email verify"], ["payments", "Payments"], ["tournaments", "Tournaments"],
                        ["results", "Results"], ["settings", "Settings"], ["rules", "Rules"]
                    ].map(([key, label]) => (
                        <button key={key} className={"tab" + (tab === key ? " is-on" : "")} type="button" role="tab" data-tab={key} aria-selected={tab === key} onClick={() => setTab(key)}>{label}</button>
                    ))}
                </div>

                <section className="tab-panel is-on" data-panel="players" style={{ display: tab === "players" ? "block" : "none" }}>
                    <div className="panel">
                        <PanelHead title="Add joined player" sub="Manually add a player who joined the match. They appear on the public players page instantly." />
                        <div className="form-grid">
                            <div className="field">
                                <label className="field-label" htmlFor="apName">User name <span className="req">*</span></label>
                                <input className="input" type="text" id="apName" placeholder="Player name" value={addForm.name} onChange={e => setAddForm(prev => ({ ...prev, name: e.target.value }))} />
                            </div>
                            <div className="field">
                                <label className="field-label" htmlFor="apGameNum">UID number</label>
                                <input className="input" type="text" id="apGameNum" placeholder="e.g. 883421" value={addForm.gameNumber} onChange={e => setAddForm(prev => ({ ...prev, gameNumber: e.target.value }))} />
                            </div>
                        </div>
                        <button className="btn primary" type="button" onClick={addPlayer}>
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M12 5v14M5 12h14" /></svg>
                            Add player
                        </button>
                    </div>

                    <p className="section-label">Joined players</p>
                    {joinedPlayers.length ? (
                        <div className="list" id="adminJoinedList">
                            {joinedPlayers.map(player => (
                                <article className="row-card" key={player.id}>
                                    <span className="avatar">{initials(player.userName)}</span>
                                    <div className="row-main">
                                        <p className="row-title">{player.userName}</p>
                                        <p className="row-sub">Game ID: {player.gameIdNumber || "—"}</p>
                                        <p className="row-sub">Joined {fmtTime(player.createdAt)}</p>
                                    </div>
                                    <div className="row-actions">
                                        <span className="badge success"><span className="dot" />Approved</span>
                                        <button className="btn outline sm" type="button" onClick={() => openEditPlayer(player.id)}>Edit</button>
                                        <button className="btn danger sm" type="button" onClick={() => deletePlayer(player.id)}>Delete</button>
                                    </div>
                                </article>
                            ))}
                        </div>
                    ) : <EmptyState id="adminJoinedEmpty" icon={<><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M23 21v-2a4 4 0 0 0-3-3.87" /><path d="M16 3.13a4 4 0 0 1 0 7.75" /></>} title="No joined players yet" text="Add a player above to build the roster." />}
                </section>

                <section className="tab-panel is-on" data-panel="emails" style={{ display: tab === "emails" ? "block" : "none" }}>
                    <div className="panel">
                        <PanelHead title="Email verification" sub="Player ke email ko verify karo. Verify karne par profile me Verified status dikhega." />
                        <div className="field">
                            <label className="field-label" htmlFor="emailSearch">Search</label>
                            <input className="input" type="text" id="emailSearch" placeholder="Name, email ya user ID" value={emailSearch} onChange={e => setEmailSearch(e.target.value)} />
                        </div>
                    </div>
                    <p className="section-label">Email requests</p>
                    {filteredEmails.length ? (
                        <div className="list" id="emailRequestList">
                            {filteredEmails.map(user => {
                                const verified = !!user.emailVerified;
                                return (
                                    <article className="row-card" key={user.id}>
                                        <span className="avatar">{initials(user.userName)}</span>
                                        <div className="row-main">
                                            <p className="row-title">{user.userName || "Player"}</p>
                                            <p className="row-sub">User ID: {user.userId || "—"}</p>
                                            <p className="row-sub">{user.email || "—"}</p>
                                        </div>
                                        <div className="row-actions">
                                            {verified ? <span className="badge success"><span className="dot" />Verified</span> : (
                                                <>
                                                    <span className="badge warning"><span className="dot" />Pending</span>
                                                    <button className="btn success sm" type="button" onClick={() => verifyEmail(user.id)}>Verify</button>
                                                </>
                                            )}
                                        </div>
                                    </article>
                                );
                            })}
                        </div>
                    ) : <EmptyState id="emailRequestEmpty" icon={<><path d="M4 4h16v16H4z" /><path d="m22 6-10 7L2 6" /></>} title="Koi email request nahi" text="Player profile se email add karega, phir yahan dikhega." />}
                </section>

                <section className="tab-panel is-on" data-panel="payments" style={{ display: tab === "payments" ? "block" : "none" }}>
                    <div className="toolbar">
                        <div className="chips">
                            {["all", "pending", "approved", "rejected"].map(value => (
                                <button key={value} className={"chip" + (filter === value ? " is-on" : "")} type="button" data-filter={value} onClick={() => setFilter(value)}>
                                    {value.charAt(0).toUpperCase() + value.slice(1)}
                                </button>
                            ))}
                        </div>
                        <div className="search">
                            <span className="lead" aria-hidden="true">
                                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="7" /><path d="M21 21l-4.35-4.35" /></svg>
                            </span>
                            <input className="input" type="text" placeholder="Search name, game ID, mobile or UTR" id="adminSearch" value={search} onChange={e => setSearch(e.target.value)} />
                        </div>
                    </div>

                    {filteredPayments.length ? (
                        <div className="list" id="adminPlayerList">
                            {filteredPayments.map(player => (
                                <article className="row-card" key={player.id}>
                                    <span className="avatar">{initials(player.userName)}</span>
                                    <div className="row-main">
                                        <p className="row-title">{player.userName}</p>
                                        <p className="row-sub">Game ID: {player.gameIdNumber || "—"}{player.gameIdLevel ? ` · Level ${player.gameIdLevel}` : ""}</p>
                                        <p className="row-sub">{fmtTime(player.createdAt)}</p>
                                    </div>
                                    <div className="row-actions">
                                        {paymentStatusBadge(player.status || "pending")}
                                        <button className="btn outline sm" type="button" onClick={() => setSelectedPlayer(player)}>View</button>
                                        {player.status !== "approved" ? <button className="btn success sm" type="button" onClick={() => setPlayerStatus(player.id, "approved")}>Approve</button> : null}
                                        {player.status !== "rejected" ? <button className="btn danger sm" type="button" onClick={() => setPlayerStatus(player.id, "rejected")}>Reject</button> : null}
                                        <button className="btn secondary sm" type="button" onClick={() => deletePlayer(player.id)}>Delete</button>
                                    </div>
                                </article>
                            ))}
                        </div>
                    ) : <EmptyState id="adminEmpty" icon={<><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M23 21v-2a4 4 0 0 0-3-3.87" /><path d="M16 3.13a4 4 0 0 1 0 7.75" /></>} title={filter === "all" ? "No payments found" : `No ${filter} payments`} text="Registrations with payment proof will appear here." />}
                </section>

                <section className="tab-panel is-on" data-panel="tournaments" style={{ display: tab === "tournaments" ? "block" : "none" }}>
                    <div className="panel" ref={tournamentPanel}>
                        <PanelHead title="Tournament manager" sub="Create matches, slots, room details and schedules. Ye data user app me turant dikhta hai." />
                        <div className="form-grid">
                            <div className="field">
                                <label className="field-label" htmlFor="tName">Tournament name <span className="req">*</span></label>
                                <input className="input" type="text" id="tName" placeholder="Friday Night Clash" value={tournamentForm.name} onChange={e => updateTournament("name", e.target.value)} />
                            </div>
                            <div className="field">
                                <label className="field-label" htmlFor="tGame">Game <span className="req">*</span></label>
                                <input className="input" type="text" id="tGame" placeholder="Free Fire" value={tournamentForm.game} onChange={e => updateTournament("game", e.target.value)} />
                            </div>
                            <div className="field full">
                                <label className="field-label" htmlFor="tImageUrl">Tournament image URL</label>
                                <input className="input" type="text" id="tImageUrl" inputMode="url" placeholder="https://.../tournament.jpg" value={tournamentForm.imageUrl} onChange={e => updateTournament("imageUrl", e.target.value)} />
                                {safeHttpUrl(tournamentForm.imageUrl) ? (
                                    <div className="t-image-preview" id="tImagePreviewWrap" style={{ display: "flex" }}>
                                        <img id="tImagePreview" alt="Tournament image preview" src={safeHttpUrl(tournamentForm.imageUrl)} />
                                        <span>Thumbnail preview</span>
                                    </div>
                                ) : null}
                                <p className="settings-note">Optional. Image tournament card ke upar full-width dikhegi — puri image bina crop ke.</p>
                            </div>
                            <div className="field">
                                <label className="field-label" htmlFor="tEntryFee">Entry fee (₹)</label>
                                <input className="input" type="number" id="tEntryFee" min="0" value={tournamentForm.entryFee} onChange={e => updateTournament("entryFee", e.target.value)} />
                            </div>
                            <div className="field">
                                <label className="field-label" htmlFor="tPrizePool">Prize pool</label>
                                <input className="input" type="text" id="tPrizePool" placeholder="₹5,000" value={tournamentForm.prizePool} onChange={e => updateTournament("prizePool", e.target.value)} />
                            </div>
                            <div className="field">
                                <label className="field-label" htmlFor="tTotalSlots">Total slots <span className="req">*</span></label>
                                <input className="input" type="number" id="tTotalSlots" min="1" value={tournamentForm.totalSlots} onChange={e => updateTournament("totalSlots", e.target.value)} />
                            </div>
                            <div className="field">
                                <label className="field-label" htmlFor="tMatchDate">Match date &amp; time <span className="req">*</span></label>
                                <input className="input" type="datetime-local" id="tMatchDate" value={tournamentForm.matchDate} onChange={e => updateTournament("matchDate", e.target.value)} />
                            </div>
                            <div className="field">
                                <label className="field-label" htmlFor="tStatus">Status</label>
                                <select className="input" id="tStatus" value={tournamentForm.status} onChange={e => updateTournament("status", e.target.value)}>
                                    <option value="open">Open</option>
                                    <option value="upcoming">Upcoming</option>
                                    <option value="closed">Closed</option>
                                    <option value="full">Full</option>
                                    <option value="ongoing">Live</option>
                                    <option value="completed">Completed</option>
                                    <option value="cancelled">Cancelled</option>
                                </select>
                            </div>
                            <div className="field">
                                <label className="field-label" htmlFor="tMatchFormat">Match format</label>
                                <input className="input" type="text" id="tMatchFormat" placeholder="Squad / Duo / Solo" value={tournamentForm.matchFormat} onChange={e => updateTournament("matchFormat", e.target.value)} />
                            </div>
                            <div className="field">
                                <label className="field-label" htmlFor="tRoomId">Room ID</label>
                                <input className="input" type="text" id="tRoomId" placeholder="Release hone ke baad" value={tournamentForm.roomId} onChange={e => updateTournament("roomId", e.target.value)} />
                            </div>
                            <div className="field">
                                <label className="field-label" htmlFor="tRoomPassword">Room password</label>
                                <input className="input" type="text" id="tRoomPassword" placeholder="Release hone ke baad" value={tournamentForm.roomPassword} onChange={e => updateTournament("roomPassword", e.target.value)} />
                            </div>
                        </div>
                        <div className="field">
                            <label className="field-label" htmlFor="tDescription">Description</label>
                            <textarea className="textarea" id="tDescription" placeholder="Tournament ka short description..." value={tournamentForm.description} onChange={e => updateTournament("description", e.target.value)} />
                        </div>
                        <div className="form-grid">
                            <div className="field">
                                <label className="field-label" htmlFor="tPrizeDistribution">Prize distribution</label>
                                <textarea className="textarea" id="tPrizeDistribution" placeholder={"1st: ₹3,000\n2nd: ₹1,500"} value={tournamentForm.prizeDistribution} onChange={e => updateTournament("prizeDistribution", e.target.value)} />
                            </div>
                            <div className="field">
                                <label className="field-label" htmlFor="tRules">Rules (one per line)</label>
                                <textarea className="textarea" id="tRules" placeholder={"Fair play only\nRoom join 10 minutes before match"} value={tournamentForm.rules} onChange={e => updateTournament("rules", e.target.value)} />
                            </div>
                        </div>
                        <div className="btn-row">
                            <button className={"btn primary" + (savingTournament ? " loading" : "")} type="button" id="tSaveBtn" disabled={savingTournament} onClick={saveTournament}>
                                {editingTournamentId ? (
                                    <><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><polyline points="20 6 9 17 4 12" /></svg> Update tournament</>
                                ) : (
                                    <><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M12 5v14M5 12h14" /></svg> Add tournament</>
                                )}
                            </button>
                            {editingTournamentId ? <button className="btn outline" type="button" id="tCancelBtn" onClick={clearTournamentForm}>Cancel edit</button> : null}
                        </div>
                    </div>

                    <p className="section-label">All tournaments</p>
                    {tournaments.length ? (
                        <div className="list" id="adminTournamentList">
                            {tournaments.map(tournament => {
                                const status = tStatus(tournament.status);
                                return (
                                    <article className="row-card" key={tournament.id}>
                                        <div className="row-main">
                                            <p className="row-title">{tournament.name || "Tournament"}</p>
                                            <p className="row-sub">{tournament.game || "Game"} · {fmtTime(tournament.matchDate) || "TBA"} · {number(tournament.joinedCount)}/{number(tournament.totalSlots)} joined</p>
                                        </div>
                                        <div className="row-actions">
                                            <span className={"badge " + status.cls}><span className="dot" />{status.label}</span>
                                            <button className="btn outline sm" type="button" onClick={() => editTournament(tournament.id)}>Edit</button>
                                            <button className="btn danger sm" type="button" onClick={() => deleteTournament(tournament.id)}>Delete</button>
                                        </div>
                                    </article>
                                );
                            })}
                        </div>
                    ) : <EmptyState id="adminTournamentEmpty" icon={<><path d="M8 21h8" /><path d="M12 17v4" /><path d="M7 4h10v5a5 5 0 0 1-10 0Z" /><path d="M7 5H4v2a4 4 0 0 0 4 4" /><path d="M17 5h3v2a4 4 0 0 1-4 4" /></>} title="Abhi koi tournament nahi" text="Upar form se pehla tournament add karo." />}
                </section>

                <section className="tab-panel is-on" data-panel="results" style={{ display: tab === "results" ? "block" : "none" }}>
                    <div className="panel">
                        <PanelHead title="Publish result" sub="Winner entries user app ke Results page aur tournament page par dikhengi." />
                        <div className="field">
                            <label className="field-label" htmlFor="rTournament">Tournament <span className="req">*</span></label>
                            <select className="input" id="rTournament" value={resultForm.tournament} onChange={e => setResultForm(prev => ({ ...prev, tournament: e.target.value }))}>
                                <option value="">{tournaments.length ? "Select tournament" : "No tournaments available"}</option>
                                {tournaments.map(tournament => <option key={tournament.id} value={tournament.id}>{tournament.name || "Tournament"} — {tStatus(tournament.status).label}</option>)}
                            </select>
                        </div>
                        <div className="form-grid">
                            <div className="field">
                                <label className="field-label" htmlFor="rWinner">Winner / team name <span className="req">*</span></label>
                                <input className="input" type="text" id="rWinner" placeholder="Winning player or team" value={resultForm.winner} onChange={e => setResultForm(prev => ({ ...prev, winner: e.target.value }))} />
                            </div>
                            <div className="field">
                                <label className="field-label" htmlFor="rRank">Rank / position</label>
                                <input className="input" type="number" id="rRank" min="1" value={resultForm.rank} onChange={e => setResultForm(prev => ({ ...prev, rank: e.target.value }))} />
                            </div>
                            <div className="field">
                                <label className="field-label" htmlFor="rPrize">Prize won</label>
                                <input className="input" type="text" id="rPrize" placeholder="₹3,000" value={resultForm.prize} onChange={e => setResultForm(prev => ({ ...prev, prize: e.target.value }))} />
                            </div>
                            <div className="field">
                                <label className="field-label" htmlFor="rStatus">Status</label>
                                <select className="input" id="rStatus" value={resultForm.status} onChange={e => setResultForm(prev => ({ ...prev, status: e.target.value }))}>
                                    <option value="published">Published</option>
                                    <option value="draft">Draft</option>
                                </select>
                            </div>
                        </div>
                        <button className="btn primary" type="button" onClick={publishResult}>
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><polyline points="20 6 9 17 4 12" /></svg>
                            Publish result
                        </button>
                    </div>
                    <p className="section-label">Result entries</p>
                    {results.length ? (
                        <div className="list" id="adminResultList">
                            {results.map(result => {
                                const published = String(result.status || "published").toLowerCase() === "published";
                                return (
                                    <article className="row-card" key={result.id}>
                                        <div className="row-main">
                                            <p className="row-title">{result.tournamentName || "Tournament"}</p>
                                            <p className="row-sub">{result.winnerName || "—"} · Rank #{result.rank || "—"} · {money(result.prize)}</p>
                                        </div>
                                        <div className="row-actions">
                                            <span className={"badge " + (published ? "success" : "neutral")}><span className="dot" />{published ? "Published" : "Draft"}</span>
                                            <button className="btn danger sm" type="button" onClick={() => deleteResult(result.id)}>Delete</button>
                                        </div>
                                    </article>
                                );
                            })}
                        </div>
                    ) : <EmptyState id="adminResultEmpty" icon={<><path d="M8 21h8" /><path d="M12 17v4" /><path d="M7 4h10v5a5 5 0 0 1-10 0Z" /><path d="M7 5H4v2a4 4 0 0 0 4 4" /><path d="M17 5h3v2a4 4 0 0 1-4 4" /></>} title="Abhi koi result nahi" text="Upar form se winner publish karo." />}
                </section>

                <section className="tab-panel is-on" data-panel="settings" style={{ display: tab === "settings" ? "block" : "none" }}>
                    <div className="panel">
                        <PanelHead title="QR & UPI settings" sub="Entry fee, payment QR, UPI ID and Telegram alerts." />
                        <div className="form-grid">
                            <div className="field">
                                <label className="field-label" htmlFor="setEntryFee">Entry fee (₹)</label>
                                <input className="input" type="number" id="setEntryFee" min="0" value={settingsForm.entryFee} onChange={e => setSettingsForm(prev => ({ ...prev, entryFee: e.target.value }))} />
                            </div>
                            <div className="field">
                                <label className="field-label" htmlFor="setReferralReward">Referral reward (₹)</label>
                                <input className="input" type="number" id="setReferralReward" min="0" value={settingsForm.referralReward} onChange={e => setSettingsForm(prev => ({ ...prev, referralReward: e.target.value }))} />
                            </div>
                            <div className="field">
                                <label className="field-label" htmlFor="setUpiId">UPI ID</label>
                                <input className="input" type="text" id="setUpiId" placeholder="yourupi@bank" value={settingsForm.upiId} onChange={e => setSettingsForm(prev => ({ ...prev, upiId: e.target.value }))} />
                            </div>
                            <div className="field full">
                                <label className="field-label" htmlFor="setQrUrl">QR image URL</label>
                                <input className="input" type="text" id="setQrUrl" placeholder="https://.../qr.png" value={settingsForm.qrUrl} onChange={e => setSettingsForm(prev => ({ ...prev, qrUrl: e.target.value }))} />
                            </div>
                        </div>
                        <div className="qr-preview" id="qrPreviewWrap">
                            {settingsForm.qrUrl ? <img id="qrPreview" src={settingsForm.qrUrl} alt="QR preview" /> : null}
                            <p>QR preview</p>
                        </div>
                        <p className="section-label">Telegram payment alert</p>
                        <div className="form-grid">
                            <div className="field">
                                <label className="field-label" htmlFor="setTgToken">Bot token</label>
                                <input className="input" type="password" id="setTgToken" placeholder="123456:ABC-..." value={settingsForm.telegramBotToken} onChange={e => setSettingsForm(prev => ({ ...prev, telegramBotToken: e.target.value }))} />
                            </div>
                            <div className="field">
                                <label className="field-label" htmlFor="setTgChat">Chat ID</label>
                                <input className="input" type="text" id="setTgChat" placeholder="-1001234567890" value={settingsForm.telegramChatId} onChange={e => setSettingsForm(prev => ({ ...prev, telegramChatId: e.target.value }))} />
                            </div>
                        </div>
                        <button className="btn primary" type="button" onClick={saveSettings}>
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><polyline points="20 6 9 17 4 12" /></svg>
                            Save settings
                        </button>
                        <p className="help" style={{ marginTop: 12 }}>Paste a QR image URL — registration page par wahi QR dikhega. UPI ID na ho to QR automatically generate hota hai.</p>
                    </div>
                </section>

                <section className="tab-panel is-on" data-panel="rules" style={{ display: tab === "rules" ? "block" : "none" }}>
                    <div id="rulesAdminList">
                        {!rules.length ? <div className="empty"><h3>No rules yet</h3><p>Add your first rule below.</p></div> : rules.map((rule, index) => (
                            <div className="rule-edit" key={index}>
                                <div className="rule-edit-head">
                                    <span className="rule-num">{index + 1}</span>
                                    <div className="btn-row">
                                        <button className="btn success sm" type="button" onClick={() => persistRules(rules)}>Save</button>
                                        <button className="btn danger sm" type="button" onClick={() => deleteRule(index)}>Delete</button>
                                    </div>
                                </div>
                                <div className="field">
                                    <label className="field-label" htmlFor={`ruleTitle_${index}`}>Rule title</label>
                                    <input className="input" type="text" id={`ruleTitle_${index}`} value={rule.title || ""} onChange={e => updateRule(index, "title", e.target.value)} />
                                </div>
                                <div className="field">
                                    <label className="field-label" htmlFor={`ruleDesc_${index}`}>Description</label>
                                    <textarea className="textarea" id={`ruleDesc_${index}`} value={rule.description || ""} onChange={e => updateRule(index, "description", e.target.value)} />
                                </div>
                            </div>
                        ))}
                    </div>
                    <div className="panel" style={{ marginTop: 16 }}>
                        <PanelHead title="Add new rule" sub="New rules appear on the public rules page immediately." />
                        <div className="field">
                            <label className="field-label" htmlFor="newRuleTitle">Rule title</label>
                            <input className="input" type="text" id="newRuleTitle" placeholder="e.g. Fair play only" value={newRule.title} onChange={e => setNewRule(prev => ({ ...prev, title: e.target.value }))} />
                        </div>
                        <div className="field">
                            <label className="field-label" htmlFor="newRuleDesc">Rule description</label>
                            <textarea className="textarea" id="newRuleDesc" placeholder="Rule details..." value={newRule.description} onChange={e => setNewRule(prev => ({ ...prev, description: e.target.value }))} />
                        </div>
                        <button className="btn primary" type="button" onClick={addRule}>
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M12 5v14M5 12h14" /></svg>
                            Add rule
                        </button>
                    </div>
                </section>
            </main>

            <footer className="site-foot">
                <Link to="/">App home</Link> &nbsp;·&nbsp;
                <Link to="/join">Players</Link> &nbsp;·&nbsp;
                <Link to="/rule">Rules</Link>
            </footer>

            {selectedPlayer ? (
                <Overlay id="playerModal" onClose={() => setSelectedPlayer(null)}>
                    <div className="modal-head">
                        <div className="modal-title">
                            <h3 id="mName">{selectedPlayer.userName || "Player"}</h3>
                            <p id="mSub">Joined {fmtTime(selectedPlayer.createdAt)}</p>
                        </div>
                        <button className="modal-close" type="button" onClick={() => setSelectedPlayer(null)} aria-label="Close">
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M18 6 6 18M6 6l12 12" /></svg>
                        </button>
                    </div>
                    <div className="detail-rows" id="mDetails">
                        <DetailRow label="Game ID name" value={selectedPlayer.gameIdName} />
                        <DetailRow label="Game ID" value={selectedPlayer.gameIdNumber} />
                        <DetailRow label="Level" value={selectedPlayer.gameIdLevel} />
                        <DetailRow label="Mobile" value={selectedPlayer.mobileNumber} />
                        <DetailRow label="Email" value={selectedPlayer.emailId} />
                        <DetailRow label="Payment name" value={selectedPlayer.paymentName} />
                        <DetailRow label="UTR number" value={selectedPlayer.utrNumber} />
                        <DetailRow label="Status" value={selectedPlayer.status || "pending"} />
                    </div>
                    {selectedPlayer.screenshot ? (
                        <div className="shot-wrap" id="mShotWrap">
                            <img id="mShot" src={selectedPlayer.screenshot} alt="Payment screenshot" />
                        </div>
                    ) : null}
                    <div className="modal-actions">
                        {selectedPlayer.status !== "approved" ? <button className="btn success sm" type="button" onClick={() => setPlayerStatus(selectedPlayer.id, "approved")}>Approve</button> : null}
                        {selectedPlayer.status !== "rejected" ? <button className="btn danger sm" type="button" onClick={() => setPlayerStatus(selectedPlayer.id, "rejected")}>Reject</button> : null}
                        <button className="btn outline sm" type="button" onClick={() => deletePlayer(selectedPlayer.id)}>Delete</button>
                    </div>
                </Overlay>
            ) : null}

            {editId ? (
                <Overlay id="editPlayerModal" onClose={() => setEditId(null)}>
                    <div className="modal-head">
                        <div className="modal-title">
                            <h3 id="editTitle">Edit player</h3>
                            <p>Update the player details below.</p>
                        </div>
                        <button className="modal-close" type="button" onClick={() => setEditId(null)} aria-label="Close">
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M18 6 6 18M6 6l12 12" /></svg>
                        </button>
                    </div>
                    <div className="field">
                        <label className="field-label" htmlFor="epName">User name <span className="req">*</span></label>
                        <input className="input" type="text" id="epName" placeholder="Player name" value={editForm.name} onChange={e => setEditForm(prev => ({ ...prev, name: e.target.value }))} />
                    </div>
                    <div className="form-grid">
                        <div className="field">
                            <label className="field-label" htmlFor="epGameNum">Game ID number</label>
                            <input className="input" type="text" id="epGameNum" placeholder="e.g. 883421" value={editForm.gameNumber} onChange={e => setEditForm(prev => ({ ...prev, gameNumber: e.target.value }))} />
                        </div>
                        <div className="field">
                            <label className="field-label" htmlFor="epGameIdName">Game ID name</label>
                            <input className="input" type="text" id="epGameIdName" placeholder="Game nickname" value={editForm.gameName} onChange={e => setEditForm(prev => ({ ...prev, gameName: e.target.value }))} />
                        </div>
                        <div className="field">
                            <label className="field-label" htmlFor="epGameIdLevel">Game ID level</label>
                            <input className="input" type="text" id="epGameIdLevel" placeholder="e.g. 72" value={editForm.gameLevel} onChange={e => setEditForm(prev => ({ ...prev, gameLevel: e.target.value }))} />
                        </div>
                    </div>
                    <div className="modal-actions">
                        <button className="btn outline sm" type="button" onClick={() => setEditId(null)}>Cancel</button>
                        <button className="btn success sm" type="button" onClick={saveEditPlayer}>Save changes</button>
                    </div>
                </Overlay>
            ) : null}
        </>
    );
}

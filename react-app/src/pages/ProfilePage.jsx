import { useEffect, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { db } from "../lib/firebase";
import { changePassword, isValidEmail, requestEmailVerification, updatePhoto, updateUserName } from "../lib/auth";
import { fmtDate, fmtTime, initials, money, number, toMillis } from "../lib/format";
import { toast } from "../lib/toast";
import { useAuth } from "../context/AuthContext";
import Topbar from "../components/Topbar";
import BottomNav from "../components/BottomNav";
import DetailRow from "../components/DetailRow";

function readFileAsDataUrl(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result);
        reader.onerror = () => reject(new Error("Image read nahi ho payi."));
        reader.readAsDataURL(file);
    });
}

function loadImage(src) {
    return new Promise((resolve, reject) => {
        const image = new Image();
        image.onload = () => resolve(image);
        image.onerror = () => reject(new Error("Image open nahi ho payi."));
        image.src = src;
    });
}

async function makeProfilePhoto(file) {
    const src = await readFileAsDataUrl(file);
    const image = await loadImage(src);
    const size = 256;
    const scale = Math.max(size / image.width, size / image.height);
    const width = Math.round(image.width * scale);
    const height = Math.round(image.height * scale);
    const canvas = document.createElement("canvas");
    canvas.width = size;
    canvas.height = size;
    const context = canvas.getContext("2d");
    if (!context) throw new Error("Photo process nahi ho payi.");
    context.fillStyle = "#ffffff";
    context.fillRect(0, 0, size, size);
    context.drawImage(image, (size - width) / 2, (size - height) / 2, width, height);
    return canvas.toDataURL("image/jpeg", 0.82);
}

export default function ProfilePage() {
    const { user, profile, refreshProfile, logout } = useAuth();
    const navigate = useNavigate();
    const photoInput = useRef(null);
    const [localProfile, setLocalProfile] = useState(profile);
    const [editing, setEditing] = useState(false);
    const [photoDirty, setPhotoDirty] = useState(false);
    const [draftPhoto, setDraftPhoto] = useState("");
    const [name, setName] = useState("");
    const [email, setEmail] = useState("");
    const [fieldErrors, setFieldErrors] = useState({ name: "", email: "" });
    const [profileMessage, setProfileMessage] = useState(null);
    const [pwMessage, setPwMessage] = useState(null);
    const [saving, setSaving] = useState(false);
    const [pwBusy, setPwBusy] = useState(false);
    const [currentPw, setCurrentPw] = useState("");
    const [newPw, setNewPw] = useState("");
    const [joins, setJoins] = useState([]);
    const [results, setResults] = useState([]);
    const [loadingJoins, setLoadingJoins] = useState(true);
    const [pageError, setPageError] = useState("");

    useEffect(() => {
        document.title = "QREN Esports — Profile";
    }, []);

    useEffect(() => {
        setLocalProfile(profile);
        if (profile) {
            setName(profile.userName || "");
            setEmail(profile.email || "");
        }
    }, [profile]);

    useEffect(() => {
        if (!user) return;
        let active = true;
        (async () => {
            try {
                const snap = await db.collection("joins").where("userId", "==", user.uid).get();
                const list = [];
                snap.forEach(doc => list.push({ ...doc.data(), id: doc.id }));
                list.sort((a, b) => toMillis(b.joinedAt) - toMillis(a.joinedAt));
                if (!active) return;
                setJoins(list);

                try {
                    const resultSnap = await db.collection("results").get();
                    const published = [];
                    resultSnap.forEach(doc => {
                        const result = { ...doc.data(), id: doc.id };
                        if (String(result.status || "published").toLowerCase() === "published") published.push(result);
                    });
                    if (active) setResults(published);
                } catch {
                    if (active) setResults([]);
                }
            } catch (err) {
                console.error(err);
                if (active) setPageError("Profile load nahi ho paya. Internet check karke reload karo.");
            } finally {
                if (active) setLoadingJoins(false);
            }
        })();
        return () => { active = false; };
    }, [user]);

    function currentPhoto() {
        return editing && photoDirty ? String(draftPhoto || "") : String(localProfile?.photo || "");
    }

    function enterEditMode() {
        if (!localProfile) return;
        setEditing(true);
        setPhotoDirty(false);
        setDraftPhoto(String(localProfile.photo || ""));
        setName(localProfile.userName || "");
        setEmail(localProfile.email || "");
        setFieldErrors({ name: "", email: "" });
        setProfileMessage(null);
    }

    function exitEditMode() {
        setEditing(false);
        setPhotoDirty(false);
        setDraftPhoto("");
        setName(localProfile?.userName || "");
        setEmail(localProfile?.email || "");
        setFieldErrors({ name: "", email: "" });
        setProfileMessage(null);
    }

    async function onPhotoChange(event) {
        const file = event.target.files?.[0];
        event.target.value = "";
        if (!file || !editing) return;
        if (!/^image\//.test(file.type)) {
            toast("Sirf image file select karo.", "danger");
            return;
        }
        if (file.size > 8 * 1024 * 1024) {
            toast("Image 8MB se chhoti honi chahiye.", "danger");
            return;
        }
        try {
            const photo = await makeProfilePhoto(file);
            setDraftPhoto(photo);
            setPhotoDirty(true);
        } catch (err) {
            toast(err.message || "Photo process nahi ho payi.", "danger");
        }
    }

    async function saveProfile(event) {
        event.preventDefault();
        if (!localProfile) {
            toast("Profile load ho raha hai. Thoda wait karo.", "danger");
            return;
        }

        const nextName = name.trim();
        const nextEmail = email.trim().toLowerCase();
        let valid = true;
        const errors = { name: "", email: "" };

        if (nextName.length < 3) {
            errors.name = "User name kam se kam 3 characters ka hona chahiye.";
            valid = false;
        } else if (nextName.length > 40) {
            errors.name = "User name 40 characters se chhota rakho.";
            valid = false;
        }

        if (nextEmail && !isValidEmail(nextEmail)) {
            errors.email = "Valid email address daalo.";
            valid = false;
        } else if (!nextEmail && localProfile.email) {
            errors.email = "Email remove nahi ho sakta. Naya email daalo.";
            valid = false;
        }
        setFieldErrors(errors);
        setProfileMessage(null);
        if (!valid) return;

        const nameChanged = nextName !== (localProfile.userName || "");
        const emailChanged = !!nextEmail && nextEmail !== (localProfile.email || "");
        if (!nameChanged && !emailChanged && !photoDirty) {
            exitEditMode();
            toast("Koi change nahi kiya.", "info");
            return;
        }

        setSaving(true);
        const messages = [];
        let nextProfile = { ...localProfile };

        if (nameChanged) {
            try {
                nextProfile.userName = await updateUserName(user, nextName);
            } catch (err) {
                messages.push(err?.code === "permission-denied" ? "Firestore rules update publish karo." : (err?.message || "Name update nahi hua."));
            }
        }
        if (photoDirty) {
            try {
                nextProfile.photo = await updatePhoto(user, draftPhoto);
            } catch (err) {
                messages.push(err?.code === "permission-denied" ? "Firestore rules update publish karo." : (err?.message || "Photo save nahi hui."));
            }
        }
        if (emailChanged) {
            try {
                await requestEmailVerification(user, nextEmail);
                nextProfile.email = nextEmail;
                nextProfile.emailVerified = false;
            } catch (err) {
                messages.push(err?.code === "permission-denied" ? "Firestore rules update publish karo." : (err?.message || "Email save nahi hui."));
            }
        }

        setSaving(false);
        setLocalProfile(nextProfile);
        setPhotoDirty(false);
        setDraftPhoto(nextProfile.photo || "");

        if (messages.length) {
            setName(nextName);
            setEmail(nextEmail);
            setProfileMessage({ type: "danger", text: messages.join(" ") });
            return;
        }

        setEditing(false);
        setProfileMessage(null);
        toast("Profile update ho gaya.", "success");
        refreshProfile().catch(() => {});
    }

    async function submitPassword(event) {
        event.preventDefault();
        setPwMessage(null);
        setPwBusy(true);
        try {
            await changePassword(user, currentPw, newPw);
            setCurrentPw("");
            setNewPw("");
            setPwMessage({ type: "success", text: "Password update ho gaya." });
        } catch (err) {
            setPwMessage({ type: "danger", text: err?.message || "Password update nahi hua." });
        } finally {
            setPwBusy(false);
        }
    }

    async function handleLogout() {
        await logout();
        navigate("/", { replace: true });
    }

    const joinedIds = new Set(joins.map(join => join.tournamentId));
    const history = results.filter(result => joinedIds.has(result.tournamentId)).sort((a, b) => {
        const diff = toMillis(b.matchDate) - toMillis(a.matchDate);
        return diff !== 0 ? diff : number(a.rank) - number(b.rank);
    });
    const photo = currentPhoto();
    const safePhoto = /^data:image\/(jpeg|png|webp);base64,/i.test(photo);

    return (
        <>
            <Topbar sub="Profile" />
            <main className="shell">
                <div className="profile-card">
                    <button className={"avatar-picker" + (editing ? " is-editing" : "")} type="button" id="avatarBtn" disabled={!editing} aria-label="Change profile photo" onClick={() => editing && photoInput.current?.click()}>
                        <span className="avatar lg" id="profileAvatar">
                            {safePhoto ? <img src={photo} alt="Profile photo" /> : initials(localProfile?.userName)}
                        </span>
                        <span className="avatar-edit-mark" aria-hidden="true">
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"><path d="M14.5 4h-5L7 7H4a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2h-3l-2.5-3z" /><circle cx="12" cy="13" r="3" /></svg>
                        </span>
                    </button>
                    <div style={{ minWidth: 0 }}>
                        <div className="profile-name" id="profileName">{localProfile?.userName || "Loading..."}</div>
                        <div className="profile-meta" id="profileMeta">{localProfile ? (localProfile.mobile ? "+91 " + localProfile.mobile : "Mobile not available") : "Profile load ho raha hai"}</div>
                        <div className="profile-uid" id="profileUid">{localProfile ? "User ID: " + (localProfile.userId || "—") : ""}</div>
                    </div>
                    <button className="btn secondary sm profile-edit-btn" type="button" id="editProfileBtn" style={{ display: editing ? "none" : "inline-flex" }} onClick={enterEditMode}>Edit profile</button>
                </div>

                <div className="detail-block" id="accountDetailsBlock" style={{ display: editing ? "none" : "block" }}>
                    <h2>Account details</h2>
                    <div className="detail-rows" id="accountDetails">
                        <DetailRow label="User name" value={localProfile?.userName} />
                        <DetailRow label="Registered mobile" value={localProfile?.mobile ? "+91 " + localProfile.mobile : ""} />
                        <DetailRow label="User ID" value={localProfile?.userId} />
                        <DetailRow label="Email" value={localProfile?.email ? localProfile.email + (localProfile.emailVerified ? " (verified)" : " (pending)") : ""} />
                        <DetailRow label="Referral code" value={localProfile?.referralCode || "—"} />
                    </div>
                </div>

                <div className="detail-block" id="profileEditBlock" style={{ display: editing ? "block" : "none" }}>
                    <h2>Edit profile</h2>
                    <form id="profileForm" noValidate onSubmit={saveProfile}>
                        <div className={"field" + (fieldErrors.name ? " invalid" : "")}>
                            <label className="field-label" htmlFor="nameInput">User name</label>
                            <input className="input" type="text" id="nameInput" maxLength="40" autoComplete="nickname" value={name} onChange={e => { setName(e.target.value); setFieldErrors(prev => ({ ...prev, name: "" })); }} />
                            <span className="field-error">{fieldErrors.name}</span>
                        </div>
                        <div className={"field" + (fieldErrors.email ? " invalid" : "")}>
                            <label className="field-label" htmlFor="emailInput">Email address</label>
                            <input className="input" type="email" id="emailInput" maxLength="120" autoComplete="email" placeholder="you@example.com" value={email} onChange={e => { setEmail(e.target.value); setFieldErrors(prev => ({ ...prev, email: "" })); }} />
                            <span className="field-error">{fieldErrors.email}</span>
                            <p className="settings-note" id="emailStatus">
                                {!localProfile?.email ? "Email add karo. Admin verify karega." : localProfile.emailVerified ? "Verified: " + localProfile.email : "Verification pending: " + localProfile.email}
                            </p>
                        </div>
                        <div className="field">
                            <label className="field-label" htmlFor="mobileInput">Registered mobile number</label>
                            <input className="input" type="tel" id="mobileInput" disabled value={localProfile?.mobile ? "+91 " + localProfile.mobile : ""} readOnly />
                            <p className="settings-note">Mobile number change karne ke liye verification zaroori hai — support se contact karo.</p>
                        </div>
                        <div className="field">
                            <label className="field-label">Profile photo</label>
                            <p className="settings-note">Photo change karne ke liye upar avatar par tap karo. Photo automatically 256px me compress hoti hai.</p>
                            {editing && safePhoto ? <button className="btn ghost sm" type="button" id="removePhotoBtn" style={{ marginTop: 8 }} onClick={() => { setDraftPhoto(""); setPhotoDirty(true); }}>Remove photo</button> : null}
                        </div>
                        {profileMessage ? <div className={"alert " + profileMessage.type} id="profileMsg" style={{ display: "flex", marginBottom: 10 }}>{profileMessage.text}</div> : null}
                        <div className="btn-row" style={{ marginTop: 4 }}>
                            <button className={"btn primary" + (saving ? " loading" : "")} type="submit" id="saveProfileBtn" disabled={saving}>
                                {saving ? <><span className="spin" aria-hidden="true" />Saving...</> : "Save changes"}
                            </button>
                            <button className="btn ghost" type="button" id="cancelEditBtn" onClick={exitEditMode}>Cancel</button>
                        </div>
                    </form>
                    <input type="file" id="photoInput" accept="image/*" hidden ref={photoInput} onChange={onPhotoChange} />
                </div>

                <div className="detail-block">
                    <h2>Change password</h2>
                    <form id="passwordForm" noValidate onSubmit={submitPassword}>
                        <div className="field">
                            <label className="field-label" htmlFor="currentPw">Current password</label>
                            <input className="input" type="password" id="currentPw" autoComplete="current-password" value={currentPw} onChange={e => setCurrentPw(e.target.value)} />
                        </div>
                        <div className="field">
                            <label className="field-label" htmlFor="newPw">New password</label>
                            <input className="input" type="password" id="newPw" autoComplete="new-password" placeholder="8+ characters, letter aur number" value={newPw} onChange={e => setNewPw(e.target.value)} />
                        </div>
                        {pwMessage ? <div className={"alert " + pwMessage.type} id="pwMsg" style={{ display: "flex", marginBottom: 10 }}>{pwMessage.text}</div> : null}
                        <button className={"btn primary" + (pwBusy ? " loading" : "")} type="submit" id="pwBtn" disabled={pwBusy}>
                            {pwBusy ? <><span className="spin" aria-hidden="true" />Updating...</> : "Update password"}
                        </button>
                    </form>
                </div>

                <p className="section-label">Joined tournaments</p>
                {loadingJoins ? (
                    <div id="joinedList" className="list">
                        <div className="skel-card"><div className="skeleton skel-line w60" /><div className="skeleton skel-line w40" /></div>
                    </div>
                ) : (
                    <div id="joinedList" className="list" style={{ display: joins.length ? "flex" : "none" }}>
                        {joins.map(join => (
                            <Link className="row-card" key={join.id} to={`/tournament?id=${encodeURIComponent(join.tournamentId)}`}>
                                <span className="avatar">{initials(join.tournamentName)}</span>
                                <div className="row-main">
                                    <p className="row-title">{join.tournamentName || "Tournament"}</p>
                                    <p className="row-sub">{join.game || "Game"} · {fmtTime(join.matchDate) || "TBA"}</p>
                                </div>
                                <span className="badge success"><span className="dot" />Joined</span>
                            </Link>
                        ))}
                    </div>
                )}

                {!loadingJoins && joins.length === 0 ? (
                    <div className="empty" id="joinedEmpty" style={{ display: "block" }}>
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M8 21h8" /><path d="M12 17v4" /><path d="M7 4h10v5a5 5 0 0 1-10 0Z" /><path d="M7 5H4v2a4 4 0 0 0 4 4" /><path d="M17 5h3v2a4 4 0 0 1-4 4" /></svg>
                        <h3>Abhi koi tournament join nahi kiya</h3>
                        <p>Home page par available tournaments dekho aur Join Tournament dabao.</p>
                    </div>
                ) : null}

                <p className="section-label" style={{ marginTop: 18 }}>Match history</p>
                {loadingJoins ? (
                    <div id="historyList" className="list">
                        <div className="skel-card"><div className="skeleton skel-line w60" /><div className="skeleton skel-line w40" /></div>
                    </div>
                ) : (
                    <div id="historyList" className="list" style={{ display: history.length ? "flex" : "none" }}>
                        {history.map(result => (
                            <div className="row-card" key={result.id}>
                                <span className="avatar">#{result.rank || "—"}</span>
                                <div className="row-main">
                                    <p className="row-title">{result.tournamentName || "Tournament"}</p>
                                    <p className="row-sub">Winner: {result.winnerName || "—"} · {fmtDate(result.matchDate) || "—"}</p>
                                </div>
                                <span className="tx-amount plus">{money(result.prize)}</span>
                            </div>
                        ))}
                    </div>
                )}

                {!loadingJoins && history.length === 0 ? (
                    <div className="empty" id="historyEmpty" style={{ display: "block" }}>
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M8 21h8" /><path d="M12 17v4" /><path d="M7 4h10v5a5 5 0 0 1-10 0Z" /><path d="M7 5H4v2a4 4 0 0 0 4 4" /><path d="M17 5h3v2a4 4 0 0 1-4 4" /></svg>
                        <h3>Abhi koi match result nahi</h3>
                        <p>Result publish hone ke baad aapki match history yahan dikhegi.</p>
                    </div>
                ) : null}

                {pageError ? (
                    <div className="alert danger" id="profileError" style={{ display: "flex" }}>
                        <span id="profileErrorText">{pageError}</span>
                    </div>
                ) : null}

                <div className="detail-block" style={{ marginTop: 18 }}>
                    <h2>Session</h2>
                    <p className="settings-note" style={{ marginBottom: 10 }}>Logout karne par session clear ho jayega.</p>
                    <button className="btn danger full" type="button" onClick={handleLogout}>Logout</button>
                </div>
            </main>
            <BottomNav active="profile" />
        </>
    );
}

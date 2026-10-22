import { useEffect, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import firebase, { db } from "../lib/firebase";
import { money, safeHttpUrl } from "../lib/format";
import { useAuth } from "../context/AuthContext";
import { useSettings } from "../context/SettingsContext";
import { toast } from "../lib/toast";
import Topbar from "../components/Topbar";
import BottomNav from "../components/BottomNav";
import DetailRow from "../components/DetailRow";

const MIN_AMOUNT = 10;
const MAX_AMOUNT = 50000;

export default function DepositPayPage() {
    const navigate = useNavigate();
    const [params] = useSearchParams();
    const { user, profile } = useAuth();
    const settings = useSettings();
    const [utr, setUtr] = useState("");
    const [error, setError] = useState("");
    const [busy, setBusy] = useState(false);

    const amount = Math.round(Number(params.get("amount")));
    const amountValid = Number.isFinite(amount) && amount >= MIN_AMOUNT && amount <= MAX_AMOUNT;
    const upiId = String(settings.upiId || "").trim();
    const payee = String(settings.upiName || settings.tournamentName || "QREN Esports").trim();
    const configuredQr = safeHttpUrl(settings.qrUrl);
    const upiUri = upiId
        ? "upi://pay?pa=" + encodeURIComponent(upiId) + "&pn=" + encodeURIComponent(payee) + "&am=" + amount + "&cu=INR"
        : "";
    const generatedQr = upiUri
        ? "https://api.qrserver.com/v1/create-qr-code/?size=260x260&data=" + encodeURIComponent(upiUri)
        : "";
    const qrSrc = configuredQr || generatedQr;

    useEffect(() => {
        document.title = "QREN Esports — Deposit payment";
    }, []);

    async function copyUpi() {
        if (!upiId) return;
        try {
            await navigator.clipboard.writeText(upiId);
            toast("UPI ID copy ho gaya.", "success");
        } catch {
            toast("UPI ID copy nahi ho paya.", "danger");
        }
    }

    async function submit(event) {
        event.preventDefault();
        setError("");
        if (!user) {
            setError("Login session nahi mila. Dobara login karo.");
            return;
        }
        if (!amountValid) {
            setError("Deposit amount valid nahi hai. Wallet se dobara try karo.");
            return;
        }
        if (!upiId) {
            setError("Admin ne UPI ID set nahi ki hai. Thodi der baad try karo ya support se contact karo.");
            return;
        }
        const reference = utr.trim().replace(/\s+/g, "").toUpperCase();
        if (reference.length < 6) {
            setError("Payment ke baad UPI app se UTR / Transaction ID daalo (kam se kam 6 characters).");
            return;
        }

        setBusy(true);
        try {
            await db.collection("transactions").add({
                userId: user.uid,
                userName: profile?.userName || user.displayName || "",
                userMobile: profile?.mobile || "",
                type: "deposit",
                amount,
                status: "pending",
                method: "upi",
                utr: reference,
                note: "Deposit request via UPI",
                createdAt: firebase.firestore.FieldValue.serverTimestamp()
            });
            toast("Deposit request submit ho gayi. Admin verify karega.", "success");
            navigate("/wallet", { replace: true });
        } catch (err) {
            console.error(err);
            setError(err?.code === "permission-denied" ? "Deposit request save nahi hui. Firestore rules publish karo." : (err?.message || "Deposit request submit nahi hui."));
        } finally {
            setBusy(false);
        }
    }

    if (!amountValid) {
        return (
            <>
                <Topbar sub="Deposit" />
                <main className="shell narrow">
                    <div className="detail-block">
                        <h2>Invalid amount</h2>
                        <p>Deposit amount {money(MIN_AMOUNT)} se {money(MAX_AMOUNT)} ke beech hona chahiye.</p>
                        <Link className="btn primary" to="/wallet/deposit" style={{ marginTop: 12 }}>Choose amount</Link>
                    </div>
                </main>
                <BottomNav active="wallet" />
            </>
        );
    }

    return (
        <>
            <Topbar sub="Deposit" />
            <main className="shell narrow">
                <div className="app-head">
                    <div>
                        <h1>Pay {money(amount)}</h1>
                        <p>QR scan karo ya UPI ID par payment karo.</p>
                    </div>
                    <Link className="btn ghost sm" to="/wallet/deposit">Change amount</Link>
                </div>

                <div className="detail-block pay-card">
                    <div className="pay-amount-row">
                        <span>Amount to pay</span>
                        <strong>{money(amount)}</strong>
                    </div>

                    {qrSrc ? (
                        <img className="pay-qr" src={qrSrc} alt={"UPI payment QR for " + money(amount)} />
                    ) : (
                        <div className="pay-qr-empty">
                            <strong>QR available nahi hai</strong>
                            <span>Admin payment QR set karega. Neeche UPI ID se payment kar sakte ho.</span>
                        </div>
                    )}

                    <div className="upi-box">
                        <div>
                            <span className="upi-label">UPI ID</span>
                            <strong className="upi-id">{upiId || "Not configured"}</strong>
                        </div>
                        {upiId ? <button className="btn secondary sm" type="button" onClick={copyUpi}>Copy</button> : null}
                    </div>

                    <div className="detail-rows" style={{ marginTop: 12 }}>
                        <DetailRow label="Payee" value={payee} />
                        <DetailRow label="Amount" value={money(amount)} />
                        <DetailRow label="Payment mode" value="UPI only" />
                    </div>

                    {upiUri ? <a className="btn secondary full" href={upiUri} style={{ marginTop: 12 }}>Open UPI app</a> : null}

                    <p className="section-label">After payment</p>
                    <form onSubmit={submit} noValidate>
                        <div className="field">
                            <label className="field-label" htmlFor="depositUtr">UTR / Transaction ID</label>
                            <input
                                className="input"
                                type="text"
                                id="depositUtr"
                                maxLength="60"
                                autoComplete="off"
                                placeholder="e.g. 123456789012"
                                value={utr}
                                onChange={event => { setUtr(event.target.value); setError(""); }}
                            />
                            <p className="settings-note">UPI app ke payment details me UTR / reference number milta hai.</p>
                        </div>
                        {error ? <div className="alert danger" style={{ display: "flex", marginBottom: 10 }}><span>{error}</span></div> : null}
                        <button className={"btn primary full" + (busy ? " loading" : "")} type="submit" disabled={busy || !upiId}>
                            {busy ? <><span className="spin" aria-hidden="true" />Submitting...</> : "I have paid"}
                        </button>
                    </form>
                </div>

                <p className="help">Deposit admin verification ke baad wallet balance me add hoga. Galat UTR par request reject ho sakti hai.</p>
            </main>
            <BottomNav active="wallet" />
        </>
    );
}

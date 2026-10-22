import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import firebase, { db } from "../lib/firebase";
import { money } from "../lib/format";
import { useAuth } from "../context/AuthContext";
import { toast } from "../lib/toast";
import Topbar from "../components/Topbar";
import BottomNav from "../components/BottomNav";
import DetailRow from "../components/DetailRow";

const MIN_AMOUNT = 10;
const MAX_AMOUNT = 50000;
const UPI_PATTERN = /^[A-Za-z0-9._-]{2,}@[A-Za-z0-9.-]{2,}$/;

export default function WithdrawPage() {
    const navigate = useNavigate();
    const { user, profile, refreshProfile } = useAuth();
    const [transactions, setTransactions] = useState([]);
    const [loadingPending, setLoadingPending] = useState(true);
    const [upiId, setUpiId] = useState("");
    const [amount, setAmount] = useState("");
    const [error, setError] = useState("");
    const [busy, setBusy] = useState(false);

    useEffect(() => {
        document.title = "QREN Esports — Withdraw";
    }, []);

    useEffect(() => {
        refreshProfile().catch(() => {});
    }, [refreshProfile]);

    useEffect(() => {
        if (!user) return undefined;
        let active = true;
        (async () => {
            try {
                const snap = await db.collection("transactions").where("userId", "==", user.uid).get();
                const list = [];
                snap.forEach(doc => list.push({ ...doc.data(), id: doc.id }));
                if (active) setTransactions(list);
            } catch (err) {
                console.error(err);
            } finally {
                if (active) setLoadingPending(false);
            }
        })();
        return () => { active = false; };
    }, [user]);

    const wallet = profile?.wallet || {};
    const pendingWithdrawal = useMemo(() => transactions
        .filter(tx => String(tx.type || "").toLowerCase() === "withdrawal" && String(tx.status || "").toLowerCase() === "pending")
        .reduce((total, tx) => total + (Number(tx.amount) || 0), 0), [transactions]);
    const balance = Math.max(0, Number(wallet.balance) || 0);
    const available = Math.max(0, balance - pendingWithdrawal);
    const value = Number(amount);
    const withdrawLimit = Math.min(available, MAX_AMOUNT);
    const amountValid = !loadingPending && Number.isFinite(value) && value >= MIN_AMOUNT && value <= withdrawLimit;
    const upiValid = UPI_PATTERN.test(upiId.trim());

    async function submit(event) {
        event.preventDefault();
        setError("");
        if (!user) {
            setError("Login session nahi mila. Dobara login karo.");
            return;
        }
        if (!upiValid) {
            setError("Valid UPI ID daalo, jaise yourname@upi.");
            return;
        }
        if (!amountValid) {
            setError("Withdrawal amount available balance ke andar hona chahiye (minimum " + money(MIN_AMOUNT) + ", per request max " + money(MAX_AMOUNT) + ").");
            return;
        }

        setBusy(true);
        try {
            await db.collection("transactions").add({
                userId: user.uid,
                userName: profile?.userName || user.displayName || "",
                userMobile: profile?.mobile || "",
                type: "withdrawal",
                amount: Math.round(value),
                status: "pending",
                method: "upi",
                upiId: upiId.trim().toLowerCase(),
                note: "Withdrawal request via UPI",
                createdAt: firebase.firestore.FieldValue.serverTimestamp()
            });
            toast("Withdrawal request submit ho gayi. Admin verify karega.", "success");
            navigate("/wallet", { replace: true });
        } catch (err) {
            console.error(err);
            setError(err?.code === "permission-denied" ? "Withdrawal request save nahi hui. Firestore rules publish karo." : (err?.message || "Withdrawal request submit nahi hui."));
        } finally {
            setBusy(false);
        }
    }

    return (
        <>
            <Topbar sub="Withdraw" />
            <main className="shell narrow">
                <div className="app-head">
                    <div>
                        <h1>Withdraw money</h1>
                        <p>Withdrawal sirf UPI ID par milega.</p>
                    </div>
                    <Link className="btn ghost sm" to="/wallet">Back to wallet</Link>
                </div>

                <div className="wallet-summary">
                    <div className="ws"><span>Wallet balance</span><strong>{money(balance)}</strong></div>
                    <div className="ws"><span>Pending withdrawal</span><strong>{money(pendingWithdrawal)}</strong></div>
                    <div className="ws"><span>Available</span><strong>{money(available)}</strong></div>
                </div>

                <form className="detail-block" onSubmit={submit} noValidate>
                    <h2>UPI withdrawal</h2>
                    <div className="field">
                        <label className="field-label" htmlFor="withdrawUpi">UPI ID</label>
                        <input
                            className="input"
                            type="text"
                            id="withdrawUpi"
                            autoComplete="off"
                            placeholder="yourname@upi"
                            value={upiId}
                            onChange={event => { setUpiId(event.target.value); setError(""); }}
                        />
                        <p className="settings-note">Sirf UPI ID. Bank account ya card details nahi chahiye.</p>
                    </div>
                    <div className="field">
                        <label className="field-label" htmlFor="withdrawAmount">Amount</label>
                        <input
                            className="input"
                            type="number"
                            id="withdrawAmount"
                            inputMode="numeric"
                            min={MIN_AMOUNT}
                            max={withdrawLimit || undefined}
                            step="1"
                            placeholder="Enter amount"
                            value={amount}
                            onChange={event => { setAmount(event.target.value); setError(""); }}
                        />
                        <p className="settings-note">Minimum {money(MIN_AMOUNT)} · Available {money(available)} · Per request max {money(MAX_AMOUNT)}</p>
                    </div>

                    <div className="detail-rows" style={{ marginBottom: 12 }}>
                        <DetailRow label="Payment mode" value="UPI only" />
                        <DetailRow label="Processing" value="Admin verification ke baad" />
                    </div>

                    {error ? <div className="alert danger" style={{ display: "flex", marginBottom: 10 }}><span>{error}</span></div> : null}
                    {!error && available < MIN_AMOUNT ? <div className="alert warning" style={{ display: "flex", marginBottom: 10 }}><span>Withdrawal ke liye wallet me enough balance nahi hai.</span></div> : null}

                    <button className={"btn primary full" + (busy ? " loading" : "")} type="submit" disabled={busy || loadingPending || available < MIN_AMOUNT}>
                        {busy ? <><span className="spin" aria-hidden="true" />Submitting...</> : "Request withdrawal"}
                    </button>
                </form>

                <p className="help">Withdrawal request admin approve karne ke baad wallet balance se deduct hoga. Galat UPI ID par request reject ho sakti hai.</p>
            </main>
            <BottomNav active="wallet" />
        </>
    );
}

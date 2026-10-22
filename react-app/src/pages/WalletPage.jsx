import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { db } from "../lib/firebase";
import { fmtTime, money, toMillis } from "../lib/format";
import { useAuth } from "../context/AuthContext";
import Topbar from "../components/Topbar";
import BottomNav from "../components/BottomNav";

function typeLabel(type) {
    const map = {
        deposit: "Deposit",
        withdrawal: "Withdrawal",
        referral: "Referral reward",
        prize: "Prize money",
        entry_fee: "Entry fee",
        refund: "Refund"
    };
    return map[String(type || "").toLowerCase()] || (type ? String(type) : "Transaction");
}

function txStatus(status) {
    const value = String(status || "pending").toLowerCase();
    if (["successful", "success", "completed"].includes(value)) return { label: "Successful", cls: "success" };
    if (["failed", "cancelled", "rejected"].includes(value)) return { label: "Failed", cls: "danger" };
    return { label: "Pending", cls: "warning" };
}

function isCredit(type) {
    return ["deposit", "referral", "prize", "refund"].includes(String(type || "").toLowerCase());
}

export default function WalletPage() {
    const navigate = useNavigate();
    const { user, profile, refreshProfile } = useAuth();
    const [transactions, setTransactions] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");

    useEffect(() => {
        document.title = "QREN Esports — Wallet";
    }, []);

    useEffect(() => {
        refreshProfile().catch(() => {});
    }, [refreshProfile]);

    useEffect(() => {
        if (!user) return;
        let active = true;
        (async () => {
            try {
                const snap = await db.collection("transactions").where("userId", "==", user.uid).get();
                const list = [];
                snap.forEach(doc => list.push({ ...doc.data(), id: doc.id }));
                list.sort((a, b) => toMillis(b.createdAt) - toMillis(a.createdAt));
                if (active) setTransactions(list);
            } catch (err) {
                console.error(err);
                if (active) setError("Transaction history load nahi ho payi. Internet check karke reload karo.");
            } finally {
                if (active) setLoading(false);
            }
        })();
        return () => { active = false; };
    }, [user]);

    const wallet = profile?.wallet || {};

    return (
        <>
            <Topbar sub="Wallet" />
            <main className="shell">
                <div className="app-head">
                    <div>
                        <h1>Wallet</h1>
                        <p>Balance aur transaction history.</p>
                    </div>
                </div>

                <section className="wallet-hero">
                    <p className="lb">Available balance</p>
                    <p className="balance" id="walletBalance">{money(wallet.balance || 0)}</p>
                    <div className="wallet-actions">
                        <button className="btn" type="button" onClick={() => navigate("/wallet/deposit")}>Deposit</button>
                        <button className="btn" type="button" onClick={() => navigate("/wallet/withdraw")}>Withdraw</button>
                    </div>
                </section>

                <p className="help" style={{ fontSize: ".72rem", color: "var(--muted)", margin: "-4px 0 14px" }}>Deposit UPI QR se karo. Withdrawal sirf UPI ID par milega. Admin verification ke baad wallet balance update hoga.</p>

                <div className="wallet-summary">
                    <div className="ws"><span>Total earnings</span><strong id="totalEarnings">{money(wallet.totalEarnings || 0)}</strong></div>
                    <div className="ws"><span>Total deposits</span><strong id="totalDeposits">{money(wallet.totalDeposits || 0)}</strong></div>
                    <div className="ws"><span>Total withdrawals</span><strong id="totalWithdrawals">{money(wallet.totalWithdrawals || 0)}</strong></div>
                </div>

                <p className="section-label">Transaction history</p>

                {loading ? (
                    <div id="txList" className="list">
                        <div className="skel-card"><div className="skeleton skel-line w60" /><div className="skeleton skel-line w40" /></div>
                    </div>
                ) : (
                    <div id="txList" className="list" style={{ display: transactions.length ? "flex" : "none" }}>
                        {transactions.map(tx => {
                            const status = txStatus(tx.status);
                            const credit = isCredit(tx.type);
                            const amount = Math.abs(Number(tx.amount) || 0);
                            return (
                                <div className="row-card" key={tx.id}>
                                    <div className="row-main">
                                        <p className="row-title">{typeLabel(tx.type)}</p>
                                        <p className="row-sub">{tx.note || ""}{tx.note ? " · " : ""}{fmtTime(tx.createdAt) || "—"}</p>
                                    </div>
                                    <div className="row-actions" style={{ flexDirection: "column", alignItems: "flex-end", gap: 4 }}>
                                        <span className={"tx-amount " + (credit ? "plus" : "minus")}>{credit ? "+" : "-"}{money(amount)}</span>
                                        <span className={"badge " + status.cls}><span className="dot" />{status.label}</span>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}

                {!loading && transactions.length === 0 && !error ? (
                    <div className="empty" id="txEmpty" style={{ display: "block" }}>
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M3 7a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2Z" /><path d="M16 12h3" /><path d="M3 9h18" /></svg>
                        <h3>Abhi koi transaction nahi</h3>
                        <p>Deposit, withdrawal aur reward transactions yahan dikhenge.</p>
                    </div>
                ) : null}

                {error ? (
                    <div className="alert danger" id="txError" style={{ display: "flex" }}>
                        <span id="txErrorText">{error}</span>
                    </div>
                ) : null}
            </main>
            <BottomNav active="wallet" />
        </>
    );
}

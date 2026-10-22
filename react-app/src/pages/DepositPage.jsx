import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { money } from "../lib/format";
import Topbar from "../components/Topbar";
import BottomNav from "../components/BottomNav";

const MIN_AMOUNT = 10;
const MAX_AMOUNT = 50000;

function buildQuickAmounts() {
    const amounts = [50, 100, 200, 500, 1000, 2000, 5000];
    for (let index = 0; index < 4; index++) {
        amounts.push((Math.floor(Math.random() * 20) + 1) * 50);
    }
    return [...new Set(amounts)].sort((a, b) => a - b).slice(0, 9);
}

export default function DepositPage() {
    const navigate = useNavigate();
    const [quickAmounts] = useState(buildQuickAmounts);
    const [amount, setAmount] = useState("");
    const value = Number(amount);
    const valid = Number.isFinite(value) && value >= MIN_AMOUNT && value <= MAX_AMOUNT;

    useEffect(() => {
        document.title = "QREN Esports — Deposit";
    }, []);

    function submit(event) {
        event.preventDefault();
        if (!valid) return;
        navigate("/wallet/deposit/pay?amount=" + encodeURIComponent(Math.round(value)));
    }

    return (
        <>
            <Topbar sub="Deposit" />
            <main className="shell narrow">
                <div className="app-head">
                    <div>
                        <h1>Add money</h1>
                        <p>Amount select karo ya apna amount likho.</p>
                    </div>
                    <Link className="btn ghost sm" to="/wallet">Back to wallet</Link>
                </div>

                <form className="detail-block" onSubmit={submit}>
                    <h2>Deposit amount</h2>
                    <div className="chips amount-chips">
                        {quickAmounts.map(option => (
                            <button
                                key={option}
                                className={"chip" + (Number(amount) === option ? " is-on" : "")}
                                type="button"
                                onClick={() => setAmount(String(option))}
                            >
                                {money(option)}
                            </button>
                        ))}
                    </div>
                    <div className="field">
                        <label className="field-label" htmlFor="depositAmount">Custom amount</label>
                        <input
                            className="input"
                            type="number"
                            id="depositAmount"
                            inputMode="numeric"
                            min={MIN_AMOUNT}
                            max={MAX_AMOUNT}
                            step="1"
                            placeholder="Enter amount"
                            value={amount}
                            onChange={event => setAmount(event.target.value)}
                        />
                        <p className="settings-note">Minimum {money(MIN_AMOUNT)} · Maximum {money(MAX_AMOUNT)}</p>
                    </div>
                    <div className="alert info" style={{ display: "flex", marginBottom: 12 }}>
                        <span>Payment ke baad UTR daalna hoga. Admin verify karne par amount wallet me add hoga.</span>
                    </div>
                    <button className="btn primary full" type="submit" disabled={!valid}>
                        Continue to payment
                    </button>
                </form>
            </main>
            <BottomNav active="wallet" />
        </>
    );
}

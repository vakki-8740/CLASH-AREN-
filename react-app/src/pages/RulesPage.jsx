import { useEffect } from "react";
import { Link } from "react-router-dom";
import { FIREBASE_CONFIGURED } from "../lib/firebase";
import { money } from "../lib/format";
import { useSettings } from "../context/SettingsContext";
import Topbar from "../components/Topbar";

export default function RulesPage() {
    const settings = useSettings();
    const rules = Array.isArray(settings.rules) ? settings.rules : [];

    useEffect(() => {
        document.title = "Tournament Rules";
    }, []);

    return (
        <>
            <Topbar sub="Tournament rules" home="/" actions={
                <Link className="icon-btn" to="/join" aria-label="Joined players">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M23 21v-2a4 4 0 0 0-3-3.87" /><path d="M16 3.13a4 4 0 0 1 0 7.75" /></svg>
                </Link>
            } />
            <main className="shell narrow">
                <section className="hero">
                    <span className="badge info"><span className="dot" />Fair play</span>
                    <h1>Tournament rules</h1>
                    <p>Please read every rule carefully before you register. By joining you agree to follow them.</p>
                    <div className="hero-meta">
                        <div className="hm"><span className="hm-lb">Entry fee</span><strong className="hm-val">{money(settings.entryFee)}</strong></div>
                        <div className="hm"><span className="hm-lb">Match time</span><strong className="hm-val" data-match>{settings.matchTime || "—"}</strong></div>
                        <div className="hm"><span className="hm-lb">Prize pool</span><strong className="hm-val" data-prize>{settings.prizePool || "—"}</strong></div>
                    </div>
                </section>

                {!FIREBASE_CONFIGURED ? (
                    <div className="alert warning setup-warning" id="setupWarning" style={{ display: "flex" }}>
                        <span className="alert-icon">
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M12 9v4" /><path d="M12 17h.01" /><path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" /></svg>
                        </span>
                        <div className="alert-body">
                            <strong className="alert-title">Firebase not configured</strong>
                            <span className="alert-text">Showing the built-in default rules.</span>
                        </div>
                    </div>
                ) : null}

                <div id="rulesList">
                    {!rules.length ? (
                        <div className="empty"><h3>No rules yet</h3><p>Rules will appear here once the admin adds them.</p></div>
                    ) : rules.map((rule, index) => (
                        <article className="rule-card" key={index}>
                            <span className="rule-num">{index + 1}</span>
                            <div className="row-main">
                                <p className="rule-title">{rule.title}</p>
                                <p className="rule-desc">{rule.description}</p>
                            </div>
                        </article>
                    ))}
                </div>

                <div className="btn-row" style={{ marginTop: 16 }}>
                    <Link className="btn primary full" to="/">
                        Register now
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M5 12h14M13 6l6 6-6 6" /></svg>
                    </Link>
                </div>
            </main>
            <footer className="site-foot">
                <Link to="/">Register</Link> &nbsp;·&nbsp;
                <Link to="/join">Players</Link> &nbsp;·&nbsp;
                <Link to="/admin">Admin</Link>
            </footer>
        </>
    );
}

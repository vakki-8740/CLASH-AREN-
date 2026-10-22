import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { login, register } from "../lib/auth";
import { useAuth } from "../context/AuthContext";
import { useSettings } from "../context/SettingsContext";
import { logoUrl } from "../lib/paths";

const EMPTY_ERRORS = { general: "", name: "", mobile: "", password: "", referral: "", setup: "" };

export default function LoginPage() {
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();
    const { user, loading } = useAuth();
    const settings = useSettings();
    const [tab, setTab] = useState(searchParams.get("ref") ? "register" : "login");
    const [loginForm, setLoginForm] = useState({ mobile: "", password: "" });
    const [registerForm, setRegisterForm] = useState({ name: "", mobile: "", password: "", referral: (searchParams.get("ref") || "").toUpperCase() });
    const [errors, setErrors] = useState(EMPTY_ERRORS);
    const [busy, setBusy] = useState(false);
    const [showLoginPassword, setShowLoginPassword] = useState(false);
    const [showRegisterPassword, setShowRegisterPassword] = useState(false);

    useEffect(() => {
        document.title = "QREN Esports — Login";
    }, []);

    useEffect(() => {
        if (!loading && user) navigate("/home", { replace: true });
    }, [loading, user, navigate]);

    function showTab(next) {
        setTab(next);
        setErrors(EMPTY_ERRORS);
    }

    function clearField(field) {
        setErrors(prev => ({ ...prev, [field]: "" }));
    }

    function handleError(err) {
        const message = err?.message || "Kuch galat ho gaya. Dobara try karo.";
        const next = { ...EMPTY_ERRORS };
        if (err?.code === "form/name") next.name = message;
        else if (err?.code === "form/mobile") next.mobile = message;
        else if (err?.code === "form/password" || err?.code === "form/current") next.password = message;
        else if (err?.code === "referral/invalid") next.referral = message;
        else next.general = message;
        if (err?.needsSetup) next.setup = message;
        setErrors(next);
    }

    async function submitLogin(event) {
        event.preventDefault();
        if (busy) return;
        setErrors(EMPTY_ERRORS);
        setBusy(true);
        try {
            await login(loginForm.mobile, loginForm.password);
            navigate("/home", { replace: true });
        } catch (err) {
            handleError(err);
            setBusy(false);
        }
    }

    async function submitRegister(event) {
        event.preventDefault();
        if (busy) return;
        setErrors(EMPTY_ERRORS);
        setBusy(true);
        try {
            await register({
                userName: registerForm.name,
                mobile: registerForm.mobile,
                password: registerForm.password,
                referralCode: registerForm.referral
            });
            navigate("/home", { replace: true });
        } catch (err) {
            handleError(err);
            setBusy(false);
        }
    }

    const fieldClass = key => "field" + (errors[key] ? " invalid" : "");

    return (
        <main className="auth-page">
            <div className="auth-shell">
                <aside className="auth-aside">
                    <a className="brand" href={import.meta.env.BASE_URL}>
                        <span className="brand-mark">
                            <img src={logoUrl} alt="QREN Esports logo" />
                        </span>
                        <span>
                            <strong className="brand-name">{settings.tournamentName}</strong>
                            <span className="brand-sub">Play. Compete. Win.</span>
                        </span>
                    </a>

                    <div>
                        <h1>Apna squad.<br />Apna arena.</h1>
                        <p>Daily Free Fire tournaments, instant entry status aur transparent results — sab ek jagah.</p>
                        <ul className="auth-points">
                            {["Verified tournament entries", "Live slots and room details", "Referral aur wallet tracking"].map(item => (
                                <li key={item}>
                                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="m20 6-11 11-5-5" /></svg>
                                    {item}
                                </li>
                            ))}
                        </ul>
                    </div>

                    <p style={{ fontSize: "0.7rem", color: "rgba(255,255,255,.55)" }}>Secure login powered by Firebase Authentication.</p>
                </aside>

                <section className="auth-main">
                    <div className="auth-main-head">
                        <div>
                            <h2 id="authHeading">{tab === "login" ? "Welcome back" : "Create your account"}</h2>
                            <p id="authSub">{tab === "login" ? "Login karke apne tournaments dekho." : "Free account banao aur tournament join karo."}</p>
                        </div>
                    </div>

                    {errors.setup ? (
                        <div className="alert danger setup-warning" id="authSetup" style={{ marginBottom: 16 }}>
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M12 9v4" /><path d="M12 17h.01" /><path d="M10.3 3.9 1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0z" /></svg>
                            <span id="authSetupText">{errors.setup}</span>
                        </div>
                    ) : null}

                    <div className="auth-tabs" role="tablist" aria-label="Login or register">
                        <button className={"auth-tab" + (tab === "login" ? " is-on" : "")} type="button" role="tab" aria-selected={tab === "login"} onClick={() => showTab("login")}>Login</button>
                        <button className={"auth-tab" + (tab === "register" ? " is-on" : "")} type="button" role="tab" aria-selected={tab === "register"} onClick={() => showTab("register")}>Register</button>
                    </div>

                    {errors.general ? (
                        <div className="alert danger" id="authError" style={{ display: "flex", marginBottom: 14 }}>
                            <span id="authErrorText">{errors.general}</span>
                        </div>
                    ) : null}

                    <form className={"auth-form" + (tab === "login" ? " is-on" : "")} id="loginForm" noValidate onSubmit={submitLogin}>
                        <div className={fieldClass("mobile")}>
                            <label className="field-label" htmlFor="loginMobile">Mobile number</label>
                            <input className="input" type="tel" id="loginMobile" inputMode="numeric" autoComplete="tel" placeholder="10 digit mobile number" maxLength="14" value={loginForm.mobile}
                                onChange={e => { setLoginForm(prev => ({ ...prev, mobile: e.target.value })); clearField("mobile"); }} />
                            <span className="field-error">{errors.mobile}</span>
                        </div>
                        <div className={fieldClass("password")}>
                            <label className="field-label" htmlFor="loginPassword">Password</label>
                            <div className="pw-wrap">
                                <input className="input" type={showLoginPassword ? "text" : "password"} id="loginPassword" autoComplete="current-password" placeholder="Your password" value={loginForm.password}
                                    onChange={e => { setLoginForm(prev => ({ ...prev, password: e.target.value })); clearField("password"); }} />
                                <button className="pw-toggle" type="button" data-pw-toggle="loginPassword" aria-label={showLoginPassword ? "Hide password" : "Show password"} onClick={() => setShowLoginPassword(value => !value)}>
                                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12z" /><circle cx="12" cy="12" r="3" /></svg>
                                </button>
                            </div>
                            <span className="field-error">{errors.password}</span>
                        </div>

                        <button className={"btn primary lg full" + (busy ? " loading" : "")} type="submit" id="loginBtn" disabled={busy}>
                            {busy ? <span className="spin" aria-hidden="true" /> : <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4" /><path d="m10 17 5-5-5-5" /><path d="M15 12H3" /></svg>}
                            {busy ? "Logging in..." : "Login"}
                        </button>

                        <p className="auth-alt">Naya player ho? <button type="button" onClick={() => showTab("register")}>Account banao</button></p>
                    </form>

                    <form className={"auth-form" + (tab === "register" ? " is-on" : "")} id="registerForm" noValidate onSubmit={submitRegister}>
                        <div className={fieldClass("name")}>
                            <label className="field-label" htmlFor="regName">User name</label>
                            <input className="input" type="text" id="regName" autoComplete="nickname" placeholder="Your in-game name" maxLength="40" value={registerForm.name}
                                onChange={e => { setRegisterForm(prev => ({ ...prev, name: e.target.value })); clearField("name"); }} />
                            <span className="field-error">{errors.name}</span>
                        </div>
                        <div className={fieldClass("mobile")}>
                            <label className="field-label" htmlFor="regMobile">Mobile number</label>
                            <input className="input" type="tel" id="regMobile" inputMode="numeric" autoComplete="tel" placeholder="10 digit mobile number" maxLength="14" value={registerForm.mobile}
                                onChange={e => { setRegisterForm(prev => ({ ...prev, mobile: e.target.value })); clearField("mobile"); }} />
                            <span className="field-error">{errors.mobile}</span>
                        </div>
                        <div className={fieldClass("password")}>
                            <label className="field-label" htmlFor="regPassword">Set password</label>
                            <div className="pw-wrap">
                                <input className="input" type={showRegisterPassword ? "text" : "password"} id="regPassword" autoComplete="new-password" placeholder="8+ characters, letter aur number" value={registerForm.password}
                                    onChange={e => { setRegisterForm(prev => ({ ...prev, password: e.target.value })); clearField("password"); }} />
                                <button className="pw-toggle" type="button" data-pw-toggle="regPassword" aria-label={showRegisterPassword ? "Hide password" : "Show password"} onClick={() => setShowRegisterPassword(value => !value)}>
                                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12z" /><circle cx="12" cy="12" r="3" /></svg>
                                </button>
                            </div>
                            <span className="field-error">{errors.password}</span>
                        </div>
                        <div className={fieldClass("referral")}>
                            <label className="field-label" htmlFor="regReferral">Referral code <span className="muted" style={{ fontWeight: 500 }}>(optional)</span></label>
                            <input className="input" type="text" id="regReferral" autoComplete="off" placeholder="Friend ka code, agar hai" maxLength="20" style={{ textTransform: "uppercase" }} value={registerForm.referral}
                                onChange={e => { setRegisterForm(prev => ({ ...prev, referral: e.target.value })); clearField("referral"); }} />
                            <span className="field-error">{errors.referral}</span>
                        </div>

                        <button className={"btn primary lg full" + (busy ? " loading" : "")} type="submit" id="registerBtn" disabled={busy}>
                            {busy ? <span className="spin" aria-hidden="true" /> : <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M19 8v6M22 11h-6" /></svg>}
                            {busy ? "Creating account..." : "Create account"}
                        </button>

                        <p className="auth-alt">Pehle se account hai? <button type="button" onClick={() => showTab("login")}>Login karo</button></p>
                    </form>

                    <p className="auth-foot">{settings.tournamentName} · Free Fire tournaments</p>
                </section>
            </div>
        </main>
    );
}

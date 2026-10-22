import { useEffect } from "react";
import { Link } from "react-router-dom";

const ICONS = {
    home: <><path d="M3 10.5 12 3l9 7.5" /><path d="M5 9.5V21h14V9.5" /><path d="M9 21v-6h6v6" /></>,
    results: <><path d="M8 21h8" /><path d="M12 17v4" /><path d="M7 4h10v5a5 5 0 0 1-10 0Z" /><path d="M7 5H4v2a4 4 0 0 0 4 4" /><path d="M17 5h3v2a4 4 0 0 1-4 4" /></>,
    referral: <><circle cx="18" cy="5" r="3" /><circle cx="6" cy="12" r="3" /><circle cx="18" cy="19" r="3" /><path d="m8.6 10.5 6.8-4" /><path d="m8.6 13.5 6.8 4" /></>,
    wallet: <><path d="M3 7a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2Z" /><path d="M16 12h3" /><path d="M3 9h18" /></>,
    profile: <><circle cx="12" cy="8" r="4" /><path d="M4 21a8 8 0 0 1 16 0" /></>
};

const ITEMS = [
    { key: "home", label: "Home", href: "/home" },
    { key: "results", label: "Results", href: "/results" },
    { key: "referral", label: "Referral", href: "/referral" },
    { key: "wallet", label: "Wallet", href: "/wallet" },
    { key: "profile", label: "Profile", href: "/profile" }
];

export default function BottomNav({ active }) {
    useEffect(() => {
        document.body.classList.add("app-page");
        return () => document.body.classList.remove("app-page");
    }, []);

    return (
        <nav id="bottomNav" className="bottom-nav" aria-label="Main navigation">
            <div className="bottom-nav-inner">
                {ITEMS.map(item => (
                    <Link key={item.key} className={"nav-item" + (item.key === active ? " is-active" : "")} to={item.href} aria-current={item.key === active ? "page" : undefined}>
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">{ICONS[item.key]}</svg>
                        <span>{item.label}</span>
                    </Link>
                ))}
            </div>
        </nav>
    );
}

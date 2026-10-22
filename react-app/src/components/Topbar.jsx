import { Link } from "react-router-dom";
import { logoUrl } from "../lib/paths";
import { useSettings } from "../context/SettingsContext";

export default function Topbar({ sub, home = "/home", actions = null }) {
    const settings = useSettings();
    return (
        <header className="topbar">
            <div className="topbar-inner">
                <Link className="brand" to={home}>
                    <span className="brand-mark">
                        <img src={logoUrl} alt="QREN Esports logo" />
                    </span>
                    <span>
                        <strong className="brand-name" data-tournament-name>{settings.tournamentName}</strong>
                        <span className="brand-sub">{sub}</span>
                    </span>
                </Link>
                {actions ? <div className="topbar-actions">{actions}</div> : null}
            </div>
        </header>
    );
}

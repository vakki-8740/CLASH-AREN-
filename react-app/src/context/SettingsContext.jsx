import { createContext, useContext, useEffect, useMemo, useState } from "react";
import { DEFAULT_SETTINGS, fetchSettings } from "../lib/settings";

const SettingsContext = createContext(DEFAULT_SETTINGS);

export function SettingsProvider({ children }) {
    const [settings, setSettings] = useState(DEFAULT_SETTINGS);

    useEffect(() => {
        let active = true;
        fetchSettings().then(value => {
            if (active) setSettings(value);
        }).catch(() => {});
        return () => { active = false; };
    }, []);

    const value = useMemo(() => settings, [settings]);
    return <SettingsContext.Provider value={value}>{children}</SettingsContext.Provider>;
}

export function useSettings() {
    return useContext(SettingsContext);
}

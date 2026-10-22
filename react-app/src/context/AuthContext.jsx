import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { auth } from "../lib/firebase";
import { loadProfile } from "../lib/auth";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
    const [user, setUser] = useState(null);
    const [profile, setProfile] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");

    useEffect(() => {
        if (!auth) {
            setLoading(false);
            setError("Firebase Auth load nahi hua. Page reload karo.");
            return undefined;
        }

        let active = true;
        const unsubscribe = auth.onAuthStateChanged(async currentUser => {
            if (!active) return;
            if (!currentUser) {
                setUser(null);
                setProfile(null);
                setLoading(false);
                return;
            }

            setUser(currentUser);
            setLoading(true);
            try {
                const data = await loadProfile(currentUser.uid);
                if (!active) return;
                setProfile(data);
                setError(data ? "" : "Profile initialize nahi ho paya. Internet/Firestore rules check karo.");
            } catch (err) {
                if (!active) return;
                console.error(err);
                setProfile(null);
                setError("Profile load nahi ho paya. Internet check karke reload karo.");
            } finally {
                if (active) setLoading(false);
            }
        }, err => {
            if (!active) return;
            console.error(err);
            setError("Auth check nahi ho paya. Page reload karo.");
            setLoading(false);
        });

        return () => {
            active = false;
            unsubscribe();
        };
    }, []);

    const refreshProfile = useCallback(async () => {
        if (!auth?.currentUser) return null;
        const data = await loadProfile(auth.currentUser.uid);
        setProfile(data);
        return data;
    }, []);

    const logout = useCallback(async () => {
        if (auth) await auth.signOut();
        setUser(null);
        setProfile(null);
    }, []);

    const value = useMemo(() => ({ user, profile, loading, error, refreshProfile, logout }), [user, profile, loading, error, refreshProfile, logout]);

    return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
    const value = useContext(AuthContext);
    if (!value) throw new Error("useAuth must be used inside AuthProvider");
    return value;
}

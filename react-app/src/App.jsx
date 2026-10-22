import { Navigate, Route, Routes } from "react-router-dom";
import { AuthProvider, useAuth } from "./context/AuthContext";
import { SettingsProvider } from "./context/SettingsContext";
import LoginPage from "./pages/LoginPage";
import HomePage from "./pages/HomePage";
import ResultsPage from "./pages/ResultsPage";
import TournamentPage from "./pages/TournamentPage";
import JoinPage from "./pages/JoinPage";
import RulesPage from "./pages/RulesPage";
import ReferralPage from "./pages/ReferralPage";
import WalletPage from "./pages/WalletPage";
import DepositPage from "./pages/DepositPage";
import DepositPayPage from "./pages/DepositPayPage";
import WithdrawPage from "./pages/WithdrawPage";
import ProfilePage from "./pages/ProfilePage";
import AdminPage from "./pages/AdminPage";
import NotFoundPage from "./pages/NotFoundPage";

function Protected({ children }) {
    const { user, loading } = useAuth();
    if (loading) return <div className="boot-loading"><div className="loading">Loading...</div></div>;
    if (!user) return <Navigate to="/" replace />;
    return children;
}

function UserApp() {
    return (
        <AuthProvider>
            <SettingsProvider>
                <Routes>
                    <Route path="/" element={<LoginPage />} />
                    <Route path="/home" element={<Protected><HomePage /></Protected>} />
                    <Route path="/results" element={<Protected><ResultsPage /></Protected>} />
                    <Route path="/tournament" element={<Protected><TournamentPage /></Protected>} />
                    <Route path="/join" element={<JoinPage />} />
                    <Route path="/rule" element={<RulesPage />} />
                    <Route path="/referral" element={<Protected><ReferralPage /></Protected>} />
                    <Route path="/wallet" element={<Protected><WalletPage /></Protected>} />
                    <Route path="/wallet/deposit" element={<Protected><DepositPage /></Protected>} />
                    <Route path="/wallet/deposit/pay" element={<Protected><DepositPayPage /></Protected>} />
                    <Route path="/wallet/withdraw" element={<Protected><WithdrawPage /></Protected>} />
                    <Route path="/profile" element={<Protected><ProfilePage /></Protected>} />
                    <Route path="*" element={<NotFoundPage />} />
                </Routes>
            </SettingsProvider>
        </AuthProvider>
    );
}

export default function App() {
    return (
        <Routes>
            <Route path="/admin/*" element={<AdminPage />} />
            <Route path="*" element={<UserApp />} />
        </Routes>
    );
}

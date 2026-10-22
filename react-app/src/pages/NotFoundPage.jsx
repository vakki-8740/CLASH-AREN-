import { Navigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

export default function NotFoundPage() {
    const { user } = useAuth();
    return <Navigate to={user ? "/home" : "/"} replace />;
}

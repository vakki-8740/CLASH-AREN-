import { createRoot } from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import App from "./App";
import ToastHost from "./components/ToastHost";
import "./ui.css";

const base = import.meta.env.BASE_URL;
const basename = base === "/" ? "/" : base.replace(/\/$/, "");

try {
    const redirect = sessionStorage.getItem("__spa_redirect");
    if (redirect) {
        sessionStorage.removeItem("__spa_redirect");
        history.replaceState(null, "", base.replace(/\/$/, "") + redirect);
    }
} catch (e) {}

createRoot(document.getElementById("root")).render(
    <BrowserRouter basename={basename}>
        <App />
        <ToastHost />
    </BrowserRouter>
);

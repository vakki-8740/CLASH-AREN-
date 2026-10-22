import { useEffect, useRef, useState } from "react";
import { setToastHandler } from "../lib/toast";

export default function ToastHost() {
    const [toast, setToast] = useState(null);
    const timer = useRef(0);

    useEffect(() => setToastHandler((message, type = "") => {
        clearTimeout(timer.current);
        setToast({ message, type });
        timer.current = setTimeout(() => setToast(null), 2600);
    }), []);

    useEffect(() => () => clearTimeout(timer.current), []);

    return <div className={"toast" + (toast ? " show " + toast.type : "")} id="toast" role="status" aria-live="polite">{toast?.message || ""}</div>;
}

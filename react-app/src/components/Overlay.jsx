import { useEffect } from "react";

export default function Overlay({ id, onClose, children, staticOverlay = false }) {
    useEffect(() => {
        document.body.style.overflow = "hidden";
        return () => { document.body.style.overflow = ""; };
    }, []);

    return (
        <div className="overlay active" id={id} role="dialog" aria-modal="true" onClick={e => {
            if (!staticOverlay && e.target === e.currentTarget) onClose?.();
        }}>
            <div className="modal">{children}</div>
        </div>
    );
}

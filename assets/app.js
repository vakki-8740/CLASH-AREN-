/* ==========================================================
   QREN Esports UI — shared helpers (OWN Library design system)
   ========================================================== */
(function () {
    "use strict";

    function esc(value) {
        return String(value == null ? "" : value)
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;")
            .replace(/"/g, "&quot;")
            .replace(/'/g, "&#39;");
    }

    function fmtTime(ts) {
        if (!ts) return "";
        var d = (ts && typeof ts.toDate === "function") ? ts.toDate() : new Date(ts);
        if (isNaN(d.getTime())) return "";
        return d.toLocaleString("en-IN", {
            day: "2-digit",
            month: "short",
            hour: "2-digit",
            minute: "2-digit"
        });
    }

    function fmtDate(ts) {
        if (!ts) return "";
        var d = (ts && typeof ts.toDate === "function") ? ts.toDate() : new Date(ts);
        if (isNaN(d.getTime())) return "";
        return d.toLocaleDateString("en-IN", {
            day: "2-digit",
            month: "short",
            year: "numeric"
        });
    }

    function initials(name) {
        return String(name || "P").split(" ").filter(function (w) { return w; })
            .map(function (w) { return w[0]; }).slice(0, 2).join("").toUpperCase() || "P";
    }

    function safeHttpUrl(value) {
        var raw = String(value == null ? "" : value).trim();
        if (!raw) return "";
        try {
            var url = new URL(raw);
            return url.protocol === "http:" || url.protocol === "https:" ? url.href : "";
        } catch (e) {
            return "";
        }
    }

    function toast(message, type) {
        var el = document.getElementById("toast");
        if (!el) {
            el = document.createElement("div");
            el.id = "toast";
            el.className = "toast";
            el.setAttribute("role", "status");
            el.setAttribute("aria-live", "polite");
            document.body.appendChild(el);
        }
        el.textContent = message;
        el.className = "toast" + (type ? " " + type : "");
        el.classList.add("show");
        clearTimeout(el._timer);
        el._timer = setTimeout(function () {
            el.classList.remove("show");
        }, 2600);
    }

    function openOverlay(id) {
        var el = document.getElementById(id);
        if (!el) return;
        el.classList.add("active");
        document.body.style.overflow = "hidden";
    }

    function closeOverlay(id) {
        var el = document.getElementById(id);
        if (!el) return;
        el.classList.remove("active");
        document.body.style.overflow = "";
    }

    function bindOverlayDismiss() {
        document.querySelectorAll("[data-close-overlay]").forEach(function (btn) {
            btn.addEventListener("click", function () {
                closeOverlay(btn.getAttribute("data-close-overlay"));
            });
        });
        document.querySelectorAll(".overlay, .sheet-overlay").forEach(function (overlay) {
            if (overlay.hasAttribute("data-static")) return;
            overlay.addEventListener("click", function (e) {
                if (e.target === overlay) closeOverlay(overlay.id);
            });
        });
    }

    function init() {
        bindOverlayDismiss();
    }

    window.CA = {
        esc: esc,
        fmtTime: fmtTime,
        fmtDate: fmtDate,
        initials: initials,
        safeHttpUrl: safeHttpUrl,
        toast: toast,
        openOverlay: openOverlay,
        closeOverlay: closeOverlay
    };

    if (document.readyState === "loading") {
        document.addEventListener("DOMContentLoaded", init);
    } else {
        init();
    }
})();

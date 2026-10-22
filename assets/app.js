/* ==========================================================
   QREN Esports UI — shared helpers (OWN Library design system)
   ========================================================== */
(function () {
    "use strict";

    var root = document.documentElement;
    var ACCENTS = {
        "default": { label: "Default", color: "#4f6bed" },
        "green": { label: "Neon Green", color: "#00ff80" },
        "cyan": { label: "Aqua Cyan", color: "#57feff" }
    };

    function setTheme(theme) {
        root.setAttribute("data-theme", theme);
        try { localStorage.setItem("theme", theme); } catch (e) { }
        syncThemeUI();
    }

    function currentTheme() {
        return root.getAttribute("data-theme") || "light";
    }

    function toggleTheme() {
        setTheme(currentTheme() === "dark" ? "light" : "dark");
    }

    function setAccent(accent) {
        if (!ACCENTS[accent]) accent = "default";
        root.setAttribute("data-accent", accent);
        try { localStorage.setItem("accent", accent); } catch (e) { }
        syncThemeUI();
    }

    function currentAccent() {
        var accent = root.getAttribute("data-accent");
        return ACCENTS[accent] ? accent : "default";
    }

    function updateMetaThemeColor() {
        var meta = document.querySelector('meta[name="theme-color"]');
        var item = ACCENTS[currentAccent()] || ACCENTS["default"];
        if (meta) meta.setAttribute("content", item.color);
    }

    function syncThemeUI() {
        var mode = currentTheme();
        document.querySelectorAll("[data-mode-set]").forEach(function (btn) {
            var on = btn.getAttribute("data-mode-set") === mode;
            btn.classList.toggle("is-on", on);
            btn.setAttribute("aria-pressed", on ? "true" : "false");
        });

        var accent = currentAccent();
        document.querySelectorAll("[data-accent-set]").forEach(function (btn) {
            var on = btn.getAttribute("data-accent-set") === accent;
            btn.classList.toggle("is-on", on);
            btn.setAttribute("aria-pressed", on ? "true" : "false");
        });
        updateMetaThemeColor();
    }

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

    function bindThemeButtons() {
        document.querySelectorAll("[data-theme-toggle]").forEach(function (btn) {
            btn.addEventListener("click", toggleTheme);
        });

        document.querySelectorAll("[data-mode-set]").forEach(function (btn) {
            btn.addEventListener("click", function () {
                var mode = btn.getAttribute("data-mode-set");
                setTheme(mode === "dark" ? "dark" : "light");
                toast(mode === "dark" ? "Dark mode on" : "Light mode on", "success");
            });
        });

        document.querySelectorAll("[data-accent-set]").forEach(function (btn) {
            btn.addEventListener("click", function () {
                var accent = btn.getAttribute("data-accent-set");
                setAccent(accent);
                var item = ACCENTS[accent] || ACCENTS["default"];
                toast(item.label + " theme applied", "success");
            });
        });
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
        if (!ACCENTS[root.getAttribute("data-accent")]) root.setAttribute("data-accent", "default");
        bindThemeButtons();
        bindOverlayDismiss();
        syncThemeUI();
    }

    window.CA = {
        setTheme: setTheme,
        toggleTheme: toggleTheme,
        currentTheme: currentTheme,
        setAccent: setAccent,
        currentAccent: currentAccent,
        esc: esc,
        fmtTime: fmtTime,
        fmtDate: fmtDate,
        initials: initials,
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

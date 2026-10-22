/* ==========================================================
   QREN Esports — app shell helpers
   Bottom navigation, page boot and small shared formatters.
   ========================================================== */
(function () {
    "use strict";

    var ICONS = {
        home: '<path d="M3 10.5 12 3l9 7.5"/><path d="M5 9.5V21h14V9.5"/><path d="M9 21v-6h6v6"/>',
        results: '<path d="M8 21h8"/><path d="M12 17v4"/><path d="M7 4h10v5a5 5 0 0 1-10 0Z"/><path d="M7 5H4v2a4 4 0 0 0 4 4"/><path d="M17 5h3v2a4 4 0 0 1-4 4"/>',
        referral: '<circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/><path d="m8.6 10.5 6.8-4"/><path d="m8.6 13.5 6.8 4"/>',
        wallet: '<path d="M3 7a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2Z"/><path d="M16 12h3"/><path d="M3 9h18"/>',
        profile: '<circle cx="12" cy="8" r="4"/><path d="M4 21a8 8 0 0 1 16 0"/>'
    };

    var ITEMS = [
        { key: "home", label: "Home", href: "../home/" },
        { key: "results", label: "Results", href: "../results/" },
        { key: "referral", label: "Referral", href: "../referral/" },
        { key: "wallet", label: "Wallet", href: "../wallet/" },
        { key: "profile", label: "Profile", href: "../profile/" }
    ];

    function svg(key) {
        return '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' + ICONS[key] + "</svg>";
    }

    function renderNav(active) {
        if (document.getElementById("bottomNav")) return;
        var nav = document.createElement("nav");
        nav.id = "bottomNav";
        nav.className = "bottom-nav";
        nav.setAttribute("aria-label", "Main navigation");

        var inner = document.createElement("div");
        inner.className = "bottom-nav-inner";

        ITEMS.forEach(function (item) {
            var a = document.createElement("a");
            a.className = "nav-item" + (item.key === active ? " is-active" : "");
            a.href = item.href;
            a.innerHTML = svg(item.key) + "<span>" + item.label + "</span>";
            if (item.key === active) a.setAttribute("aria-current", "page");
            inner.appendChild(a);
        });

        nav.appendChild(inner);
        document.body.appendChild(nav);
        document.body.classList.add("app-page");
    }

    function statusInfo(status) {
        var value = String(status || "").toLowerCase();
        var map = {
            open: { label: "Open", cls: "success" },
            upcoming: { label: "Upcoming", cls: "info" },
            full: { label: "Full", cls: "warning" },
            ongoing: { label: "Live", cls: "info" },
            completed: { label: "Completed", cls: "neutral" },
            cancelled: { label: "Cancelled", cls: "danger" },
            closed: { label: "Closed", cls: "neutral" }
        };
        return map[value] || { label: value ? value.charAt(0).toUpperCase() + value.slice(1) : "Unknown", cls: "neutral" };
    }

    function money(value) {
        if (value === 0 || value === "0") return "₹0";
        if (value == null || value === "") return "—";
        var str = String(value).trim();
        if (str.charAt(0) === "₹") return str;
        var num = Number(str);
        if (isNaN(num)) return str;
        return "₹" + num.toLocaleString("en-IN");
    }

    function number(value) {
        var num = Number(value);
        return isNaN(num) ? 0 : num;
    }

    function remainingSlots(t) {
        return Math.max(number(t.totalSlots) - number(t.joinedCount), 0);
    }

    function joinBlockReason(t) {
        if (!t) return "Tournament nahi mila.";
        var status = String(t.status || "").toLowerCase();
        if (status === "cancelled") return "Ye tournament cancel ho chuka hai.";
        if (status === "completed") return "Ye tournament complete ho chuka hai.";
        if (status === "ongoing") return "Tournament live hai, joining band hai.";
        if (status === "closed") return "Joining closed hai.";
        if (status === "full") return "Tournament full hai.";
        if (remainingSlots(t) <= 0) return "Saari slots bhar chuki hain.";
        return "";
    }

    function timestampToInput(ts) {
        if (!ts) return "";
        var d = (ts && typeof ts.toDate === "function") ? ts.toDate() : new Date(ts);
        if (isNaN(d.getTime())) return "";
        var pad = function (n) { return String(n).padStart(2, "0"); };
        return d.getFullYear() + "-" + pad(d.getMonth() + 1) + "-" + pad(d.getDate()) + "T" + pad(d.getHours()) + ":" + pad(d.getMinutes());
    }

    function applySettings(settings) {
        if (!settings) return;
        document.querySelectorAll("[data-tournament-name]").forEach(function (el) {
            if (settings.tournamentName) el.textContent = settings.tournamentName;
        });
    }

    async function boot(activePage) {
        renderNav(activePage);

        var user = await CA_AUTH.requireUser("../");
        var profile = await CA_AUTH.loadProfile(user.uid);

        if (typeof fetchSettings === "function") {
            fetchSettings().then(applySettings).catch(function () { });
        }

        return { user: user, profile: profile };
    }

    window.CA_PAGE = {
        boot: boot,
        renderNav: renderNav,
        statusInfo: statusInfo,
        money: money,
        number: number,
        remainingSlots: remainingSlots,
        joinBlockReason: joinBlockReason,
        timestampToInput: timestampToInput,
        applySettings: applySettings
    };
})();

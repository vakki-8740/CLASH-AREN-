export function fmtTime(ts) {
    if (!ts) return "";
    const date = ts && typeof ts.toDate === "function" ? ts.toDate() : new Date(ts);
    if (Number.isNaN(date.getTime())) return "";
    return date.toLocaleString("en-IN", {
        day: "2-digit",
        month: "short",
        hour: "2-digit",
        minute: "2-digit"
    });
}

export function fmtDate(ts) {
    if (!ts) return "";
    const date = ts && typeof ts.toDate === "function" ? ts.toDate() : new Date(ts);
    if (Number.isNaN(date.getTime())) return "";
    return date.toLocaleDateString("en-IN", {
        day: "2-digit",
        month: "short",
        year: "numeric"
    });
}

export function initials(name) {
    return String(name || "P").split(" ").filter(Boolean)
        .map(word => word[0]).slice(0, 2).join("").toUpperCase() || "P";
}

export function safeHttpUrl(value) {
    const raw = String(value ?? "").trim();
    if (!raw) return "";
    try {
        const url = new URL(raw);
        return url.protocol === "http:" || url.protocol === "https:" ? url.href : "";
    } catch {
        return "";
    }
}

export function toMillis(timestamp) {
    if (!timestamp) return 0;
    if (typeof timestamp.toMillis === "function") return timestamp.toMillis();
    const date = new Date(timestamp);
    return Number.isNaN(date.getTime()) ? 0 : date.getTime();
}

export function statusInfo(status) {
    const value = String(status || "").toLowerCase();
    const map = {
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

export function money(value) {
    if (value === 0 || value === "0") return "₹0";
    if (value == null || value === "") return "—";
    const str = String(value).trim();
    if (str.charAt(0) === "₹") return str;
    const num = Number(str);
    if (Number.isNaN(num)) return str;
    return "₹" + num.toLocaleString("en-IN");
}

export function number(value) {
    const num = Number(value);
    return Number.isNaN(num) ? 0 : num;
}

export function remainingSlots(tournament) {
    return Math.max(number(tournament?.totalSlots) - number(tournament?.joinedCount), 0);
}

export function joinBlockReason(tournament) {
    if (!tournament) return "Tournament nahi mila.";
    const status = String(tournament.status || "").toLowerCase();
    if (status === "cancelled") return "Ye tournament cancel ho chuka hai.";
    if (status === "completed") return "Ye tournament complete ho chuka hai.";
    if (status === "ongoing") return "Tournament live hai, joining band hai.";
    if (status === "closed") return "Joining closed hai.";
    if (status === "full") return "Tournament full hai.";
    if (remainingSlots(tournament) <= 0) return "Saari slots bhar chuki hain.";
    return "";
}

export function effectiveStatus(tournament) {
    if (remainingSlots(tournament) <= 0 && !["completed", "cancelled", "closed"].includes(String(tournament.status || "").toLowerCase())) {
        return "full";
    }
    return tournament.status || "open";
}

export function timestampToInput(timestamp) {
    if (!timestamp) return "";
    const date = timestamp && typeof timestamp.toDate === "function" ? timestamp.toDate() : new Date(timestamp);
    if (Number.isNaN(date.getTime())) return "";
    const pad = value => String(value).padStart(2, "0");
    return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

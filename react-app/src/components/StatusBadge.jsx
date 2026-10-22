import { statusInfo } from "../lib/format";

export default function StatusBadge({ status }) {
    const info = statusInfo(status);
    return <span className={"badge " + info.cls}><span className="dot" />{info.label}</span>;
}

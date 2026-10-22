export default function DetailRow({ label, value }) {
    return (
        <div className="detail-row">
            <span className="k">{label}</span>
            <span className="v">{value || "—"}</span>
        </div>
    );
}

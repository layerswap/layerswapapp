"use client";

// Tiny inline area sparkline (no axes / labels). Derived from the backend
// timeline series — purely decorative magnitude cue for a summary card.
export default function Sparkline({
    values,
    color,
    width = 96,
    height = 28,
}: {
    values: number[];
    color: string;
    width?: number;
    height?: number;
}) {
    const pts = values.filter((v) => Number.isFinite(v));
    if (pts.length < 2) return <span style={{ display: "inline-block", width, height }} />;

    const max = Math.max(...pts);
    const min = Math.min(...pts, 0);
    const span = max - min || 1;
    const stepX = width / (pts.length - 1);
    const y = (v: number) => height - ((v - min) / span) * (height - 2) - 1;

    const line = pts.map((v, i) => `${i === 0 ? "M" : "L"}${(i * stepX).toFixed(2)},${y(v).toFixed(2)}`).join(" ");
    const area = `${line} L${width},${height} L0,${height} Z`;
    const gid = `spark-${color.replace("#", "")}`;

    return (
        <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`} aria-hidden="true" style={{ display: "block" }}>
            <defs>
                <linearGradient id={gid} x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor={color} stopOpacity={0.35} />
                    <stop offset="100%" stopColor={color} stopOpacity={0.02} />
                </linearGradient>
            </defs>
            <path d={area} fill={`url(#${gid})`} />
            <path d={line} fill="none" stroke={color} strokeWidth={1.5} strokeLinejoin="round" strokeLinecap="round" />
        </svg>
    );
}

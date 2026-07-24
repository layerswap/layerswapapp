export type TimeParts = { hours: number; minutes: number; seconds: number };

export function msToParts(ms: number): TimeParts {
    const totalSeconds = Math.floor(ms / 1000);
    return {
        hours: Math.floor(totalSeconds / 3600),
        minutes: Math.floor((totalSeconds % 3600) / 60),
        seconds: totalSeconds % 60,
    };
}

/** Parse "H:MM:SS" or "H:MM:SS.fff" (API average completion format). */
export function parseHmsString(value: string | undefined): TimeParts | null {
    if (!value) return null;
    const [whole] = value.split('.');
    const segments = whole.split(':').map(Number);
    if (segments.length !== 3 || segments.some(n => Number.isNaN(n))) return null;
    const [hours, minutes, seconds] = segments;
    return { hours, minutes, seconds };
}

/** ETA-style: "~3h" | "~12 min" | "~45s" — highest non-zero unit only. */
export function formatEtaFromMs(ms: number): string {
    const { hours, minutes, seconds } = msToParts(ms);
    if (hours > 0) return `~${hours}h`;
    if (minutes > 0) return `~${minutes} min`;
    return `~${seconds}s`;
}

/** Digital-clock format: "01:23:45" (hours omitted when zero). */
export function formatHmsClock(parts: TimeParts): string {
    const h = parts.hours > 0 ? String(parts.hours).padStart(2, '0') + ':' : '';
    const m = String(parts.minutes).padStart(2, '0');
    const s = String(parts.seconds).padStart(2, '0');
    return `${h}${m}:${s}`;
}

/** Verbose elapsed: "1h 23m 45s" — drops zero leading units. */
export function formatElapsedHms(parts: TimeParts): string {
    const out: string[] = [];
    if (parts.hours) out.push(`${parts.hours}h`);
    if (parts.minutes) out.push(`${parts.minutes}m`);
    if (!parts.hours && (parts.seconds || !parts.minutes)) out.push(`${parts.seconds}s`);
    return out.join(' ');
}

/** Pluralized words: "1 hour 23 minutes" / "45 secs". */
export function formatVerboseHms(parts: TimeParts): string {
    const { hours, minutes, seconds } = parts;
    const segments: string[] = [];
    if (hours > 0) segments.push(`${hours} ${hours > 1 ? 'hours' : 'hour'}`);
    if (minutes > 0) segments.push(`${minutes} ${minutes > 1 ? 'minutes' : 'minute'}`);
    if (seconds > 0 && minutes === 0 && hours === 0) segments.push(`${seconds} secs`);
    return segments.join(' ');
}

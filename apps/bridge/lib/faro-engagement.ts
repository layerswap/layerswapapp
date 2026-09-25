/** Foreground, focused time, capped at 30 seconds since the last interaction. */
export function createEngagementClock(now: () => number, idleMs = 30_000) {
    let previous = now()
    let activeUntil = previous + idleMs
    let visible = false
    let accumulated = 0
    const settle = () => {
        const current = now()
        if (visible) accumulated += Math.max(0, Math.min(current, activeUntil) - previous)
        previous = current
    }
    return {
        activity() { settle(); if (visible) activeUntil = now() + idleMs },
        visibility(value: boolean) { settle(); visible = value; if (value) activeUntil = now() + idleMs },
        flush() { settle(); const delta = accumulated; accumulated = 0; return Math.round(delta) },
    }
}

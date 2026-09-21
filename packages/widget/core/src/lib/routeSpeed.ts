import { hmsToMs } from "@/components/utils/formatTime";

/**
 * Thresholds for flagging a route as slow, based on the quote's
 * `avg_completion_time`. Both are open for discussion — typical routes
 * complete in well under a minute, while e.g. withdrawals to Bitcoin
 * average around 20 minutes.
 */
/** At or above this the estimated time is highlighted in the warning color. */
export const SLOW_ROUTE_THRESHOLD_MS = 5 * 60 * 1000;
/** At or above this the user must confirm before the swap flow starts. */
export const VERY_SLOW_ROUTE_THRESHOLD_MS = 20 * 60 * 1000;

export type RouteSpeed = 'normal' | 'slow' | 'very_slow';

export function resolveRouteSpeedFromMs(ms: number | undefined): RouteSpeed {
    if (ms === undefined || !Number.isFinite(ms)) return 'normal';
    if (ms >= VERY_SLOW_ROUTE_THRESHOLD_MS) return 'very_slow';
    if (ms >= SLOW_ROUTE_THRESHOLD_MS) return 'slow';
    return 'normal';
}

/** Classify a quote's `avg_completion_time` ("H:MM:SS.fff"). Unparsable input is treated as normal. */
export function resolveRouteSpeed(avgCompletionTime: string | undefined): RouteSpeed {
    return resolveRouteSpeedFromMs(hmsToMs(avgCompletionTime));
}

/** Text color for an estimate: yellow for slow, red for very slow, or the given default. */
export function routeSpeedTextClass(speed: RouteSpeed, defaultClass: string): string {
    switch (speed) {
        case 'very_slow': return 'text-error-foreground';
        case 'slow': return 'text-warning-foreground';
        default: return defaultClass;
    }
}

export function isSlowRoute(avgCompletionTime: string | undefined): boolean {
    return resolveRouteSpeed(avgCompletionTime) !== 'normal';
}

export function isVerySlowRoute(avgCompletionTime: string | undefined): boolean {
    return resolveRouteSpeed(avgCompletionTime) === 'very_slow';
}

export type LifecycleObservationScope = {
    swapId?: string;
    hasSeenSwap: boolean;
};

/** Initial draft → first ID enriches an observation. After a real swap has
 * existed, every ID transition (including A → draft → B) starts a new scope.
 * Called from committed effects so discarded renders cannot advance the scope. */
export function advanceLifecycleObservationScope(scope: LifecycleObservationScope, swapId?: string): boolean {
    const changed = scope.hasSeenSwap && scope.swapId !== swapId;
    scope.swapId = swapId;
    scope.hasSeenSwap ||= !!swapId;
    return changed;
}

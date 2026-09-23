import { SWAP_LIFECYCLE_TRACKING_STEPS, SwapStatus, type SwapLifecycleEvent, type SwapStatusEvent } from '@layerswap/widget-types'

// Dashboard-compatible legacy swap events (`swap_initiated`, `swap_pending`,
// `swap_completed`, `swap_failed`). They are derived from BOTH widget streams:
// the API status stream is the only feeder of `swap_pending`, while the
// lifecycle stream reports completion/failure the UI resolves before (or
// without) a terminal API status. The recorder's name+swap dedupe makes
// whichever feeder arrives first win, so cardinality stays one per name per swap.
// The widget's own dedupe does not make this redundant: it is per stream and per
// attempt (a retry or reopened modal may repeat a status), onSwapComplete is a
// third feeder of swap_completed, and lifecycle phase steps (swap_completed,
// swap_failed) are observations of the current phase, reported when a finished
// swap is opened, not transitions like onSwapStatusChange.
// So only transitions (swap creation, API status changes) are recorded for any
// swap; phase observations and onSwapComplete are recorded only for swaps this
// page watched (see SWAP_LIFECYCLE_TRACKING_STEPS). Reloading a finished swap
// therefore sends nothing.
// Pure module (no React/Next imports) so it runs under `test:faro`.

const TRACKING_STEPS = new Set<string>(SWAP_LIFECYCLE_TRACKING_STEPS)

export type LegacySwapEventName = 'swap_pending' | 'swap_completed' | 'swap_failed'

export function legacyEventFromStatus(event: Pick<SwapStatusEvent, 'type'>): LegacySwapEventName | undefined {
    switch (event.type) {
        case SwapStatus.Completed: return 'swap_completed'
        case SwapStatus.Failed:
        case SwapStatus.Expired: return 'swap_failed'
        case SwapStatus.LsTransferPending: return 'swap_pending'
        default: return undefined
    }
}

export function legacyEventFromLifecycle(event: Pick<SwapLifecycleEvent, 'step'>): LegacySwapEventName | undefined {
    switch (event.step) {
        case 'swap_completed': return 'swap_completed'
        case 'swap_failed':
        case 'swap_expired': return 'swap_failed'
        default: return undefined
    }
}

export function legacyAttributesFromStatus(event: SwapStatusEvent): Record<string, unknown> {
    return {
        swap_id: event.swapId,
        from_address: event.fromAddress,
        to_address: event.toAddress,
        source_network: event.sourceNetwork,
        destination_network: event.destinationNetwork,
        source_token: event.sourceToken,
        destination_token: event.destinationToken,
        status: event.type,
        path: event.path,
    }
}

export function legacyAttributesFromLifecycle(event: SwapLifecycleEvent): Record<string, unknown> {
    return {
        swap_id: event.swapId,
        from_address: event.fromAddress,
        to_address: event.toAddress,
        source_network: event.sourceNetwork,
        destination_network: event.destinationNetwork,
        source_token: event.sourceToken,
        destination_token: event.destinationToken,
        status: event.status,
        phase: event.phase,
        path: event.path,
    }
}

export function createLegacySwapEventRecorder({ captureEvent, setLegacyContext, maxEntries = 256 }: {
    captureEvent: (name: string, attributes: Record<string, unknown>) => boolean
    setLegacyContext: (attributes: Record<string, unknown>) => void
    /** Bounds the dedupe and tracking memory for very long multi-swap sessions. */
    maxEntries?: number
}) {
    const emitted = new Set<string>()
    const tracked = new Set<string>()
    // Re-insert so recently observed keys outlive idle ones (Set iteration order
    // is insertion order), then drop the least recently observed beyond the bound.
    const remember = (set: Set<string>, key: string) => {
        set.delete(key)
        set.add(key)
        while (set.size > maxEntries) {
            set.delete(set.values().next().value as string)
        }
    }
    const track = (swapId: unknown) => {
        if (swapId !== undefined && swapId !== null && swapId !== '') remember(tracked, String(swapId))
    }

    const capture = (name: LegacySwapEventName | 'swap_initiated', attributes: Record<string, unknown>) => {
        const dedupeKey = `${name}:${String(attributes.swap_id ?? '')}`
        if (emitted.has(dedupeKey)) {
            remember(emitted, dedupeKey)
            return
        }

        setLegacyContext(attributes)

        const accepted = captureEvent(name, {
            ...attributes,
            page_url: typeof window !== 'undefined' ? window.location.href : undefined,
        })
        if (!accepted) return
        remember(emitted, dedupeKey)
    }

    return {
        /** A transition (swap creation or an API status change): recorded for any swap, and marks it watched. */
        record(name: LegacySwapEventName | 'swap_initiated', attributes: Record<string, unknown>) {
            track(attributes.swap_id)
            capture(name, attributes)
        },
        /** The swap's current phase or onSwapComplete: recorded only for swaps this page watched. */
        recordObservation(name: LegacySwapEventName, attributes: Record<string, unknown>) {
            if (!tracked.has(String(attributes.swap_id ?? ''))) return
            capture(name, attributes)
        },
        /** Marks the swap watched when the step shows this page following it before its outcome. */
        observeLifecycle(event: Pick<SwapLifecycleEvent, 'step' | 'swapId'>) {
            if (TRACKING_STEPS.has(event.step)) track(event.swapId)
        },
    }
}

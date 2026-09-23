import { SwapStatus, type SwapLifecycleEvent, type SwapStatusEvent } from '@layerswap/widget-types'

// Dashboard-compatible legacy swap events (`swap_initiated`, `swap_pending`,
// `swap_completed`, `swap_failed`). They are derived from BOTH widget streams:
// the API status stream is the only feeder of `swap_pending`, while the
// lifecycle stream reports completion/failure the UI resolves before (or
// without) a terminal API status. The recorder's name+swap dedupe makes
// whichever feeder arrives first win, so cardinality stays one per name per swap.
// Pure module (no React/Next imports) so it runs under `test:faro`.

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
    /** Bounds the dedupe memory for very long multi-swap sessions. */
    maxEntries?: number
}) {
    const emitted = new Set<string>()
    return {
        record(name: LegacySwapEventName | 'swap_initiated', attributes: Record<string, unknown>) {
            const swapId = attributes.swap_id
            const dedupeKey = `${name}:${String(swapId ?? '')}`
            if (emitted.has(dedupeKey)) {
                // Re-insert so a swap that is still being replayed outlives idle ones
                // (Set iteration order is insertion order).
                emitted.delete(dedupeKey)
                emitted.add(dedupeKey)
                return
            }

            setLegacyContext(attributes)

            const accepted = captureEvent(name, {
                ...attributes,
                page_url: typeof window !== 'undefined' ? window.location.href : undefined,
            })
            if (!accepted) return
            emitted.add(dedupeKey)
            // Drop the least recently observed key beyond the bound.
            while (emitted.size > maxEntries) {
                emitted.delete(emitted.values().next().value as string)
            }
        },
    }
}

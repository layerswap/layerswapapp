import { SwapStatus, type SwapStatusEvent } from '@layerswap/widget-types'

/** The identity of a status notification: a backend status change for one swap. */
export type SwapStatusIdentity = Pick<SwapStatusEvent, 'swapId' | 'type'>

/**
 * Every non-identity field of a status notification. These are a snapshot at
 * transition time and never trigger or repeat a delivery. Adding a field to
 * SwapStatusEvent fails check:types until it is classified here.
 */
export const SWAP_STATUS_CONTEXT_FIELDS = Object.keys({
    path: true, fromAddress: true, toAddress: true,
    sourceNetwork: true, destinationNetwork: true, sourceToken: true, destinationToken: true,
} satisfies Record<Exclude<keyof SwapStatusEvent, keyof SwapStatusIdentity>, true>) as readonly Exclude<keyof SwapStatusEvent, keyof SwapStatusIdentity>[]

/** Notification policy is applied after observation, never before recording the baseline. */
export const REPORTED_SWAP_STATUSES: ReadonlySet<SwapStatus> = new Set([
    SwapStatus.LsTransferPending, SwapStatus.Completed, SwapStatus.Failed, SwapStatus.Expired,
])

type Observation = { createdHere: boolean; status?: SwapStatus }
const MAX_SWAPS = 64

/** One backend history per widget, independent of modal lifetime and wallet attempts. */
export function createSwapStatusObserver() {
    const swaps = new Map<string, Observation>()
    const remember = (id: string, observation: Observation) => {
        swaps.delete(id)
        swaps.set(id, observation)
        while (swaps.size > MAX_SWAPS) swaps.delete(swaps.keys().next().value as string)
    }
    return {
        created(swapId: string) {
            remember(swapId, { ...swaps.get(swapId), createdHere: true })
        },
        observe(event: Pick<SwapStatusEvent, 'swapId' | 'type'>): boolean {
            const previous = swaps.get(event.swapId)
            remember(event.swapId, { createdHere: previous?.createdHere ?? false, status: event.type })
            if (previous?.status === event.type) return false
            // Opening existing data establishes a silent baseline. All later changes are
            // transitions, including a change from a status the host doesn't subscribe to.
            const transition = previous?.status !== undefined || previous?.createdHere === true
            return transition && REPORTED_SWAP_STATUSES.has(event.type)
        },
    }
}

import { SwapStatus } from '@layerswap/widget-types'
import type { SwapResponse } from './apiClients/layerSwapApiClient'
import { parseHmsString } from '@/components/utils/formatTime'

/** Must stay below HOT_INTERVAL_MS so SWR dedup never swallows a scheduled poll. */
export const SWAP_POLL_DEDUPE_MS = 200

const HOT_INTERVAL_MS = 300
/** How long after a trigger (tx submit / payload change) polling stays at the hot interval. */
const HOT_WINDOW_MS = 6_000
/** A swap with no payload change for this long is an outlier — relax polling. */
const MIN_OUTLIER_THRESHOLD_MS = 60_000

export type SwapPollingInput = {
    /** Only backend facts can end observation. UI phases and local failures are not inputs. */
    swap?: Pick<SwapResponse['swap'], 'status' | 'transactions' | 'use_deposit_address'>
    refuelRequired?: boolean
    hasError?: boolean
    now: number
    /** Last time the swap payload changed (or polling started). */
    lastChangeAt: number
    /** When the user's withdrawal tx was submitted from the wallet, if it was. */
    txSubmittedAt?: number
    /** Quote's avg_completion_time in "H:MM:SS.fff" format. */
    avgCompletionTime?: string
}

/** [elapsed is below this ms, use this interval] — first match wins. */
type Step = [belowMs: number, intervalMs: number]

export function resolveSwapPollingInterval(input: SwapPollingInput): number {
    const { swap, refuelRequired, now, lastChangeAt, txSubmittedAt, avgCompletionTime } = input
    if (!swap?.status) return input.hasError ? 5000 : 1000
    if ([SwapStatus.Failed, SwapStatus.Expired, SwapStatus.Refunded].includes(swap.status)) return 0
    const outputReady = swap.transactions?.some(t => t.type === 'output' && t.transaction_hash && t.amount)
    const refuelReady = !refuelRequired || swap.transactions?.some(t => t.type === 'refuel' && t.transaction_hash && t.amount)
    // Backend completion and settlement data are both required. Early UI completion must
    // not hide the eventual backend transition, and completed can precede output/refuel data.
    if (swap.status === SwapStatus.Completed && outputReady && refuelReady) return 0

    const sinceActivity = Math.max(0, now - Math.max(lastChangeAt, txSubmittedAt ?? 0))

    const awaitingDeposit = (swap.status === SwapStatus.Created || swap.status === SwapStatus.UserTransferPending)
        && !swap.transactions?.some(t => t.type === 'input') && txSubmittedAt == null
    if (awaitingDeposit) {
        // Wallet flow before the user signs: nothing changes server-side until they act.
        if (!swap.use_deposit_address)
            return withJitter(stepInterval(sinceActivity, [[30_000, 3_000], [120_000, 5_000]], 10_000))
        // Deposit-address flow: the server can detect an incoming transfer at any moment.
        return withJitter(stepInterval(sinceActivity, [[60_000, 1_000], [180_000, 2_000]], 5_000))
    }

    if (swap.status === SwapStatus.PendingRefund)
        return withJitter(stepInterval(sinceActivity, [[60_000, 2_000]], 5_000))

    // Hot phases (InputPending / OutputPending / SettlingOutput): completion is expected
    // within seconds of the last movement, so hold the floor while the payload is changing
    // and decay only once it stalls.
    if (sinceActivity < HOT_WINDOW_MS) return withJitter(HOT_INTERVAL_MS)

    const avgMs = hmsToMs(avgCompletionTime)
    const outlierAt = Math.max(MIN_OUTLIER_THRESHOLD_MS, avgMs ? avgMs * 2 : 0)
    if (sinceActivity > outlierAt * 5) return withJitter(10_000)
    if (sinceActivity > outlierAt) return withJitter(5_000)

    return withJitter(stepInterval(sinceActivity, [[15_000, 1_000]], 2_000))
}

function stepInterval(elapsedMs: number, steps: Step[], fallbackMs: number): number {
    for (const [below, interval] of steps) {
        if (elapsedMs < below) return interval
    }
    return fallbackMs
}

/** ±15% so simultaneously-started clients don't synchronize into request spikes. */
function withJitter(ms: number): number {
    return Math.round(ms * (0.85 + Math.random() * 0.3))
}

function hmsToMs(value: string | undefined): number | undefined {
    const parts = parseHmsString(value)
    if (!parts) return undefined
    return ((parts.hours * 60 + parts.minutes) * 60 + parts.seconds) * 1000
}

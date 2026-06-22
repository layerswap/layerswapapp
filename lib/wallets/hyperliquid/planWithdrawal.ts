import { WithdrawableSplit } from '@/lib/apiClients/hyperliquidClient'
import { HYPERLIQUID_DEX_PERP, HYPERLIQUID_DEX_SPOT } from './constants'

/**
 * The decision of how to source a Hyperliquid withdrawal from the two HyperCore
 * pools. Either a single pool already covers it (no transfer), or we must move a
 * deficit between pools first, or the combined balance is insufficient.
 */
export type WithdrawalPlan =
    | { insufficient: true }
    | {
        insufficient?: false
        /** Pool the `sendToEvmWithData` withdrawal pulls from. */
        sourceDex: string
        /** Present only when neither pool alone covered `required`: move this first. */
        transfer?: { toPerp: boolean; amount: string }
    }

/** Round UP to `decimals` so a consolidated pool truly reaches the target. */
const roundUpToDecimals = (value: number, decimals: number): number => {
    const factor = 10 ** decimals
    return Math.ceil(value * factor) / factor
}

/**
 * Pick the cheapest way to fund a withdrawal of `required` USDC (amount + headroom)
 * from the spot/perps split:
 *  - spot alone covers it  → withdraw from spot, no transfer
 *  - else perp alone covers → withdraw from perp, no transfer
 *  - else combined covers   → consolidate into the LARGER pool (minimizes the moved
 *    amount; ties prefer spot), then withdraw from it
 *  - else                   → insufficient
 *
 * The transfer `deficit` is rounded up to `decimals` (so the target reaches the
 * strictly-greater threshold) and clamped to the source pool's available balance.
 */
export function planWithdrawal(split: WithdrawableSplit, required: number, decimals: number): WithdrawalPlan {
    const { spot, perps, combined } = split

    if (spot >= required) return { sourceDex: HYPERLIQUID_DEX_SPOT }
    if (perps >= required) return { sourceDex: HYPERLIQUID_DEX_PERP }
    if (combined < required) return { insufficient: true }

    // Neither pool alone covers it; consolidate into the larger pool.
    const targetIsSpot = spot >= perps
    const targetCurrent = targetIsSpot ? spot : perps
    const sourceAvailable = targetIsSpot ? perps : spot

    const deficit = Math.min(roundUpToDecimals(required - targetCurrent, decimals), sourceAvailable)

    return {
        sourceDex: targetIsSpot ? HYPERLIQUID_DEX_SPOT : HYPERLIQUID_DEX_PERP,
        // toPerp: true moves spot→perp (target = perp); false moves perp→spot (target = spot).
        transfer: { toPerp: !targetIsSpot, amount: deficit.toFixed(decimals) },
    }
}

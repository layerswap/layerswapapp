import { WithdrawableSplit } from './hyperliquidClient'
import { HYPERLIQUID_DEX_PERP, HYPERLIQUID_DEX_SPOT } from './constants'
import { formatUnits } from 'viem'

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

/**
 * Pick the cheapest way to fund `required` USDC base units (amount + headroom)
 * from the spot/perps split:
 *  - spot alone covers it  → withdraw from spot, no transfer
 *  - else perp alone covers → withdraw from perp, no transfer
 *  - else combined covers   → consolidate into the LARGER pool (minimizes the moved
 *    amount; ties prefer spot), then withdraw from it
 *  - else                   → insufficient
 *
 * All comparisons and the transfer deficit use exact base units. If the combined
 * balance covers the requirement, the source pool can cover the entire deficit.
 */
export function planWithdrawal(split: WithdrawableSplit, required: bigint, decimals: number): WithdrawalPlan {
    const { spot, perps, combined } = split

    if (spot >= required) return { sourceDex: HYPERLIQUID_DEX_SPOT }
    if (perps >= required) return { sourceDex: HYPERLIQUID_DEX_PERP }
    if (combined < required) return { insufficient: true }

    // Neither pool alone covers it; consolidate into the larger pool.
    const targetIsSpot = spot >= perps
    const targetCurrent = targetIsSpot ? spot : perps
    const deficit = required - targetCurrent

    return {
        sourceDex: targetIsSpot ? HYPERLIQUID_DEX_SPOT : HYPERLIQUID_DEX_PERP,
        // toPerp: true moves spot→perp (target = perp); false moves perp→spot (target = spot).
        transfer: { toPerp: !targetIsSpot, amount: formatUnits(deficit, decimals) },
    }
}

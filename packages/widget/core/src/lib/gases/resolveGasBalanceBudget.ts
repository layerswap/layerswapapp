import type { GasWithToken } from '@layerswap/widget-types'

const GAS_FEE_SAFETY_MULTIPLIER = 1.02

/**
 * Amount of the native token that must not be included in a MAX transfer.
 * Fee volatility and protocol-level account reserves are deliberately modeled
 * separately, so a reserve is never inflated as if it were a gas estimate.
 */
export const resolveGasBalanceBudget = (gasData?: GasWithToken) => {
    if (!gasData) return 0

    const maximumFee = gasData.maxFee ?? gasData.gas
    return (maximumFee * GAS_FEE_SAFETY_MULTIPLIER) + (gasData.balanceReserve ?? 0)
}

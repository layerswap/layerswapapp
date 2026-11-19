import type { GasWithToken } from '@layerswap/widget-types'

const GAS_FEE_SAFETY_MULTIPLIER = 1.02

/**
 * Amount of the native token that must not be included in a MAX transfer.
 * Fee volatility and protocol-level account reserves are deliberately modeled
 * separately, so a reserve is never inflated as if it were a gas estimate.
 */
export const resolveGasBalanceBudget = (gasData?: Pick<GasWithToken, 'gas' | 'maxFee' | 'requiredFee' | 'reserve'>, { exactTransfer = false }: { exactTransfer?: boolean } = {}) => {
    if (!gasData) return 0

    // An exact amount-dependent transfer already includes all of its fee.
    // The safety margin sizes a draft; it is not an additional charge on that transfer.
    if (exactTransfer && gasData.requiredFee !== undefined && gasData.maxFee === undefined) {
        return gasData.gas + (gasData.reserve ?? 0)
    }

    const feeToBuffer = gasData.maxFee ?? gasData.requiredFee ?? gasData.gas
    // An absorbed remainder is already paid as fee. Buffer the required fee,
    // then cover whichever is larger; buffering the remainder creates a Max loop.
    return Math.max(gasData.gas, feeToBuffer * GAS_FEE_SAFETY_MULTIPLIER) + (gasData.reserve ?? 0)
}

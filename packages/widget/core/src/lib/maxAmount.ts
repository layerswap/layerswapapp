import type { GasWithToken, NetworkRoute, Token, TokenBalance } from '@layerswap/widget-types'
import { resolveMaxAllowedAmount } from '@/components/Input/Amount/helpers'
import { truncateToDecimals } from '@/components/utils/RoundDecimals'

export function maxAmountSource(network?: string, token?: string, accountId?: string, address?: string): string {
    return JSON.stringify([network, token, accountId, address])
}

export class MaxAmountChangedError extends Error {
    constructor() {
        super('Your balance or network fee changed. Review the updated amount and quote, then continue.')
        this.name = 'MaxAmountChangedError'
    }
}

// Keep the form/API amount a plain decimal even for very small token balances.
function amountText(value: number, decimals: number): string {
    const truncated = truncateToDecimals(String(value), decimals)
    return /e/i.test(truncated) ? Number(truncated).toFixed(decimals).replace(/\.?0+$/, '') : truncated
}

/** Estimate a buffered maximum, then verify it is affordable. Fee estimates can
 * change between RPC reads; the buffer absorbs small movements without requiring
 * two estimates to be identical. Bound retries for large amount-dependent changes. */
export async function calculateMaxAmount({ network, token, balance, limit, probeAmount, preserveAmount = false, estimateGas }: {
    network: NetworkRoute
    token: Token
    balance: TokenBalance | undefined
    limit: number | undefined
    probeAmount?: string
    /** At confirmation, keep the reviewed amount if the fresh fee still fits. */
    preserveAmount?: boolean
    estimateGas: (amount: number) => Promise<GasWithToken | undefined>
}): Promise<string> {
    if (balance?.error || balance?.amount == null || !Number.isFinite(balance.amount) || balance.amount < 0)
        throw new Error('Could not refresh your balance. Try again.')
    if (limit == null || !Number.isFinite(limit) || limit < 0)
        throw new Error('Could not refresh the route limit. Try again.')
    const upperBound = Math.min(balance.amount, limit)
    if (upperBound === 0) return '0'
    // Resolve the fee asset from the provider: some routes charge processing
    // fees in the transferred token even when it isn't the network's native asset.

    const probe = Number(probeAmount)
    let candidate = Number(truncateToDecimals(String(Math.min(Number.isFinite(probe) && probe > 0 ? probe : upperBound, upperBound)), token.decimals))
    if (candidate === 0) return '0'
    for (let attempt = 0; attempt < 4; attempt++) {
        const gas = await estimateGas(candidate)
        const payable = resolveMaxAllowedAmount({
            fromCurrency: token, native_currency: gas?.token ?? network.token,
            walletBalance: balance, limitsMaxAmount: limit,
            gasAmount: gas?.gas, gasReserve: gas?.reserve, depositMethod: 'wallet',
        })
        if (payable == null) throw new Error('Could not estimate the network fee. Try again.')
        const maximum = Number(amountText(payable, token.decimals))
        if (maximum === 0) return '0'
        const feeToken = gas?.token ?? network.token
        const paysFeeInSource = !feeToken || feeToken.symbol === token.symbol
        const requiredFee = paysFeeInSource ? gas!.gas + (gas!.reserve ?? 0) : 0
        const affordable = candidate + requiredFee <= balance.amount
        // The first read establishes the buffered maximum. Subsequent reads only
        // verify affordability, so a few wei of fee drift don't restart the search.
        // On confirmation we can also keep the original reviewed amount, provided
        // it wasn't capped by a lower balance/limit and its actual fee still fits.
        if (maximum === candidate || (affordable && (attempt > 0 || (preserveAmount && candidate === probe))))
            return amountText(candidate, token.decimals)
        candidate = maximum
    }
    throw new Error('Network fees are changing. Wait a moment and try again.')
}

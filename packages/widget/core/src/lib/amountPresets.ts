import type { GasWithToken, NetworkRoute, Token, TokenBalance } from '@layerswap/widget-types'
import { resolveMaxAllowedAmount } from '@/components/Input/Amount/helpers'
import { ceilToDecimals, truncateToDecimals } from '@/components/utils/RoundDecimals'

export type AmountPreset = 'min' | 'half' | 'max'
export type AmountMode = 'manual' | AmountPreset

export function isAmountPreset(mode: string | undefined): mode is AmountPreset {
    return mode === 'min' || mode === 'half' || mode === 'max'
}

export function amountPresetSource(network?: string, token?: string, accountId?: string, address?: string): string {
    return JSON.stringify([network, token, accountId, address])
}

export class AmountPresetChangedError extends Error {
    constructor() {
        super('Your balance, network fee, or route limits changed. Review the updated amount and quote, then continue.')
        this.name = 'AmountPresetChangedError'
    }
}

export class AmountPresetUnavailableError extends Error {
    constructor(message: string, public amount?: string) {
        super(message)
        this.name = 'AmountPresetUnavailableError'
    }
}

// Keep form/API amounts as plain decimals, including very small token balances.
function amountText(value: number, decimals: number): string {
    const truncated = truncateToDecimals(String(value), decimals)
    return /e/i.test(truncated) ? Number(truncated).toFixed(decimals).replace(/\.?0+$/, '') : truncated
}

export function resolvePresetAmount(mode: AmountPreset, spendable: number, minimum: number, decimals: number): string {
    return amountText(mode === 'min' ? ceilToDecimals(minimum, decimals) : spendable * (mode === 'half' ? 0.5 : 1), decimals)
}

/** Estimate the preset at its actual transfer amount, then verify affordability.
 * The gas buffer absorbs small RPC movements; large changes have bounded retries. */
export async function calculatePresetAmount({ network, token, balance, limit, minimum, mode = 'max', probeAmount, preserveAmount = false, estimateGas }: {
    network: NetworkRoute
    token: Token
    balance: TokenBalance | undefined
    limit: number | undefined
    minimum?: number
    mode?: AmountPreset
    probeAmount?: string
    /** At confirmation, keep the reviewed amount if it still fits this preset's bounds. */
    preserveAmount?: boolean
    estimateGas: (amount: number) => Promise<GasWithToken | undefined>
}): Promise<string> {
    if (balance?.error || balance?.amount == null || !Number.isFinite(balance.amount) || balance.amount < 0)
        throw new Error('Could not refresh your balance. Try again.')
    if (limit == null || !Number.isFinite(limit) || limit < 0 || (mode === 'min' && (minimum == null || !Number.isFinite(minimum) || minimum <= 0)))
        throw new AmountPresetUnavailableError('Route limits unavailable')
    const upperBound = Math.min(balance.amount, limit)
    const minAmount = resolvePresetAmount('min', 0, minimum ?? 0, token.decimals)
    if (mode === 'min' && Number(minAmount) > limit)
        throw new AmountPresetUnavailableError('Route limits unavailable', minAmount)
    if (upperBound === 0) {
        if (mode === 'min') throw new AmountPresetUnavailableError('Insufficient balance', minAmount)
        return '0'
    }

    const probe = Number(probeAmount)
    const initialAmount = mode === 'min'
        ? (preserveAmount && probe >= Number(minAmount) && probe <= upperBound ? probe : Number(minAmount))
        : Math.min(Number.isFinite(probe) && probe > 0 ? probe : upperBound, upperBound)
    let candidate = Number(amountText(initialAmount, token.decimals))
    if (candidate === 0) return '0'
    for (let attempt = 0; attempt < 4; attempt++) {
        const gas = await estimateGas(candidate)
        const payable = resolveMaxAllowedAmount({
            fromCurrency: token, native_currency: gas?.token ?? network.token,
            walletBalance: balance, limitsMaxAmount: limit,
            gasAmount: gas?.gas, gasReserve: gas?.reserve, depositMethod: 'wallet',
        })
        if (payable == null) throw new Error('Could not estimate the network fee. Try again.')
        const target = Number(resolvePresetAmount(mode, payable, minimum ?? 0, token.decimals))
        const feeToken = gas?.token ?? network.token
        const paysFeeInSource = !feeToken || feeToken.symbol === token.symbol
        const requiredFee = paysFeeInSource ? gas!.gas + (gas!.reserve ?? 0) : 0
        const affordableLimit = Math.max(0, Math.min(balance.amount - requiredFee, limit))
        const withinPreset = candidate <= affordableLimit * (mode === 'half' ? 0.5 : 1)
            && (mode !== 'min' || candidate >= Number(minAmount))
        if (preserveAmount && candidate === probe && withinPreset) return amountText(candidate, token.decimals)
        if (mode === 'min' && target > payable)
            throw new AmountPresetUnavailableError('Insufficient balance', minAmount)
        if (target === 0) return '0'
        // First establish the preset from the buffered spendable balance. Later
        // reads verify it instead of requiring exactly identical fee estimates.
        if (target === candidate || (mode !== 'min' && withinPreset && attempt > 0))
            return amountText(candidate, token.decimals)
        candidate = target
    }
    throw new Error('Network fees are changing. Wait a moment and try again.')
}

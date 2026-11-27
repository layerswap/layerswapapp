import type { GasWithToken, NetworkRoute, Token, TokenBalance } from '@layerswap/widget-types'
import { resolveMaxAllowedAmount } from '@/components/Input/Amount/helpers'
import { ceilToDecimals, truncateToDecimals } from '@/components/utils/RoundDecimals'
import { resolveGasBalanceBudget } from '@/lib/gases/resolveGasBalanceBudget'
import KnownInternalNames from '@layerswap/utils/known-ids'

export type AmountPreset = 'min' | 'half' | 'max'
// Quick fills keep the chosen token amount fixed, including in USD display mode.
export type AmountMode = 'manual' | 'fixed' | AmountPreset

export function isWalletAmountFlow(values: { depositMethod?: string; fromExchange?: unknown }): boolean {
    return values.depositMethod === 'wallet' && !values.fromExchange
}

export function isAmountPreset(mode: string | undefined): mode is AmountPreset {
    return mode === 'min' || mode === 'half' || mode === 'max'
}

/** Bundled adapter capability gaps, not a fallback for transient RPC failures.
 * These routes retain quick fills until balance/fee estimation is supported. */
export function supportsLiveAmountPreset(network: NetworkRoute, token: Token): boolean {
    if (network.name === KnownInternalNames.Networks.ParadexMainnet
        || network.name === KnownInternalNames.Networks.ParadexTestnet) return false
    return !(network.name === KnownInternalNames.Networks.TONMainnet
        && token.symbol === network.token?.symbol)
}

export function amountPresetSource(network?: string, token?: string, accountId?: string, address?: string): string {
    return JSON.stringify([network, token, accountId, address])
}

/** Fee observed for a swap attempt's real deposit transaction, kept by the swap
 * context. Before a swap exists the preset can only price a plain transfer, so
 * later presets for the same route and funding account budget at least this.
 * Failed Min attempts expire because no accepted swap can refresh their fee. */
export type AmountPresetGasFloor = { scope: string; gas: GasWithToken; expiresAt?: number }

export const FAILED_MIN_GAS_FLOOR_TTL_MS = 60_000

export function amountPresetGasFloorScope(presetSource: string | undefined, destinationNetwork: string | undefined, destinationToken: string | undefined): string {
    return JSON.stringify([presetSource, destinationNetwork, destinationToken])
}

export function resolveAmountPresetGasFloor(floor: AmountPresetGasFloor | undefined, scope: string): GasWithToken | undefined {
    if (!floor || floor.scope !== scope || (floor.expiresAt !== undefined && floor.expiresAt <= Date.now())) {
        return undefined
    }
    return floor.gas
}

/** The fresh estimate still owns failures and the fee token. The floor only raises
 * the fee, and whichever side knows a larger account reserve keeps it. */
export function withGasFloor(gas: GasWithToken | undefined, floor: GasWithToken | undefined): GasWithToken | undefined {
    if (!gas || !floor || gas.token?.symbol !== floor.token?.symbol) return gas
    const fee = (floor.maxFee ?? floor.gas) > (gas.maxFee ?? gas.gas) ? floor : gas
    const reserve = Math.max(gas.reserve ?? 0, floor.reserve ?? 0)
    return { gas: fee.gas, ...(fee.maxFee !== undefined ? { maxFee: fee.maxFee } : {}), token: gas.token, ...(reserve > 0 ? { reserve } : {}) }
}

/** The largest amount the funding account can still send once a fee is known,
 * or undefined when the requested amount already fits or no smaller amount
 * satisfies the route. Non-native sources are only capped by their balance. */
export function resolveDepositFeeAdjustedAmount({ requestedAmount, walletBalance, gas, token, nativeToken, limitsMaxAmount, minAllowedAmount = 0 }: {
    requestedAmount: string | number
    walletBalance: TokenBalance | undefined
    gas: GasWithToken | undefined
    token: Token
    nativeToken: Token | undefined
    limitsMaxAmount?: number
    minAllowedAmount?: number
}): string | undefined {
    const maxAmount = resolveMaxAllowedAmount({
        walletBalance, gasAmount: gas?.maxFee ?? gas?.gas, gasReserve: gas?.reserve,
        fromCurrency: token, native_currency: gas?.token ?? nativeToken,
        limitsMaxAmount, depositMethod: 'wallet',
    })
    if (maxAmount == null || !Number.isFinite(maxAmount)) return undefined
    const adjusted = truncateToDecimals(String(maxAmount), token.decimals)
    const amount = Number(adjusted)
    // Only a reduction that still satisfies the route after token rounding.
    return amount > 0 && amount >= minAllowedAmount && amount < Number(requestedAmount) ? adjusted : undefined
}

export const AMOUNT_ADJUSTMENT_MESSAGE = 'Your balance, network fee, or route limits changed. Adjust the amount to continue.'
/** The created swap's own deposit transaction costs more than the preset budgeted. */
export const DEPOSIT_FEE_ADJUSTMENT_MESSAGE = 'The network fee for this swap is higher than estimated. Adjust the amount to cover it.'

export class AmountPresetChangedError extends Error {
    constructor(message = AMOUNT_ADJUSTMENT_MESSAGE) {
        super(message)
        this.name = 'AmountPresetChangedError'
    }
}

/** A confirmation that cannot send the reviewed amount offers this instead. The reviewed
 * amount stays on screen until the user adjusts; only then is any fee floor recorded,
 * since a recorded floor would make the live preset rewrite the amount on its own. */
export type AmountPresetProposal = { amount: string; message: string; floor?: AmountPresetGasFloor }

/** The largest reduction a confirmation applies on the user's behalf: within this share
 * of the reviewed amount, or within this many dollars when the amount is so small that
 * the fee gap exceeds the share. The wallet still shows the final amount before signing. */
export const AUTO_REVISION_MAX_RATIO = 0.01
export const AUTO_REVISION_MAX_USD = 0.01

/** A reduction small enough to send in the same click instead of asking for another review. */
export function isSmallAmountRevision(reviewed: string | number, revised: string | number, priceInUsd?: number): boolean {
    const from = Number(reviewed)
    const to = Number(revised)
    if (!Number.isFinite(from) || !Number.isFinite(to) || from <= 0 || to <= 0 || to >= from) return false
    const reduction = from - to
    if (reduction / from <= AUTO_REVISION_MAX_RATIO) return true
    return priceInUsd != null && Number.isFinite(priceInUsd) && priceInUsd > 0
        && reduction * priceInUsd <= AUTO_REVISION_MAX_USD
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
    /** At confirmation, keep a reviewed amount the payable balance and route limits still cover. */
    preserveAmount?: boolean
    estimateGas: (amount: number) => Promise<GasWithToken | undefined>
}): Promise<string> {
    if (balance?.error || balance?.amount == null || !Number.isFinite(balance.amount) || balance.amount < 0)
        throw new Error('Could not refresh your balance. Try again.')
    if (limit == null || !Number.isFinite(limit) || limit < 0 || (mode === 'min' && (minimum == null || !Number.isFinite(minimum) || minimum <= 0)))
        throw new AmountPresetUnavailableError('Route limits unavailable')
    const upperBound = Math.min(balance.amount, limit)
    const insufficientBalanceMessage = `Insufficient ${token.symbol} balance`
    const minAmount = resolvePresetAmount('min', 0, minimum ?? 0, token.decimals)
    if (mode === 'min' && Number(minAmount) > limit)
        throw new AmountPresetUnavailableError('Route limits unavailable', minAmount)
    if (upperBound === 0) {
        if (mode === 'min') throw new AmountPresetUnavailableError(insufficientBalanceMessage, minAmount)
        return '0'
    }

    const probe = Number(probeAmount)
    if (preserveAmount && mode !== 'min' && probe < Number(minAmount)) {
        throw new AmountPresetUnavailableError('The minimum swap amount increased. Select an amount again.')
    }
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
            gasAmount: gas?.maxFee ?? gas?.gas, gasReserve: gas?.reserve, depositMethod: 'wallet',
        })
        if (payable == null) throw new Error('Could not estimate the network fee. Try again.')
        const target = Number(resolvePresetAmount(mode, payable, minimum ?? 0, token.decimals))
        const feeToken = gas?.token ?? network.token
        const paysFeeInSource = !feeToken || feeToken.symbol === token.symbol
        const requiredFee = paysFeeInSource ? resolveGasBalanceBudget(gas) : 0
        const presetScale = mode === 'half' ? 0.5 : 1
        const withinPreset = candidate <= payable * presetScale
            && (mode !== 'min' || candidate >= Number(minAmount))
        // Half only selects the form amount. A reviewed amount the full payable
        // balance still covers is kept; a replacement is Half of what remains.
        const fundable = mode === 'half' ? candidate <= payable : withinPreset
        if (preserveAmount && candidate === probe && fundable) return amountText(candidate, token.decimals)
        if (mode === 'min' && target > payable)
            throw new AmountPresetUnavailableError(balance.amount >= target && paysFeeInSource
                ? `Not enough ${feeToken?.symbol ?? token.symbol} for network fees`
                : insufficientBalanceMessage, minAmount)
        if (target === 0) return '0'
        // First establish the preset from the buffered spendable balance. Later
        // reads verify it instead of requiring exactly identical fee estimates.
        if (target === candidate || (mode !== 'min' && withinPreset && attempt > 0))
            return amountText(candidate, token.decimals)
        // Small fee increases can otherwise consume every retry: the previous
        // target sits exactly at the buffered limit. Leave another fee margin
        // when that happens, then verify the reduced amount on the next read.
        // Account reserves stay separate and are never multiplied.
        const maximumFee = gas?.maxFee ?? gas?.gas ?? 0
        const feeMargin = paysFeeInSource ? requiredFee - maximumFee - (gas?.reserve ?? 0) : 0
        const smallFeeIncrease = attempt > 0 && mode !== 'min'
            && candidate > target && candidate - target <= feeMargin * presetScale
        const cushionedTarget = Number(resolvePresetAmount(mode, Math.max(0, payable - feeMargin), minimum ?? 0, token.decimals))
        // Extra headroom must not push an otherwise valid transfer below minimum.
        candidate = smallFeeIncrease ? Math.max(Math.min(target, Number(minAmount)), cushionedTarget) : target
    }
    throw new Error('Network fees are changing. Wait a moment and try again.')
}

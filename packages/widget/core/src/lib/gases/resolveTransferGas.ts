import type { GasProps, GasWithToken, Network, Token } from '@layerswap/widget-types'
import type { DepositAction } from '@/lib/apiClients/layerSwapApiClient'
import { isTransferAction } from '@/helpers/depositActions'

/** Only estimate an action belonging to the displayed source account and asset. */
export function resolveTransferGas(action: DepositAction | undefined, network: Network | undefined, token: Token | undefined, address: string | undefined) {
    if (!action || !isTransferAction(action) || !network || !token || !address
        || !action.to_address || action.amount == null
        || (action.network && action.network.name !== network.name)
        || (action.token && action.token.symbol !== token.symbol)
        || (action.from_address && action.from_address.toLowerCase() !== address.toLowerCase())) return undefined
    return {
        amount: action.amount,
        transaction: {
            recipientAddress: action.to_address,
            callData: action.call_data ?? '',
            amountInBaseUnits: action.amount_in_base_units,
        },
    }
}

export function gasEstimateKey({ address, network, token, amount, recipientAddress, callData, amountInBaseUnits }: Partial<GasProps>) {
    const baseKey = `/gases/${address}/${network?.name}/${token?.symbol}/${amount}`
    return recipientAddress != null && callData != null
        ? [baseKey, recipientAddress, callData, amountInBaseUnits ?? null]
        : baseKey
}

/** Compare in fee-token units so floating point noise never creates a review loop. */
export function transferFeeChanged(previous: GasWithToken | undefined, next: GasWithToken) {
    if (!previous || previous.token.symbol !== next.token.symbol) return true
    const scale = 10 ** next.token.decimals
    return Math.round(previous.gas * scale) !== Math.round(next.gas * scale)
}

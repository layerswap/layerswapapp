import type { GasWithToken, Wallet } from '@layerswap/widget-types'
import type { SwapFormValues } from '@/components/Pages/Swap/Form/SwapFormValues'
import type { DepositAction } from '@/lib/apiClients/layerSwapApiClient'
import { resolveDepositGasTransaction } from '@/helpers/depositActions'
import { resolverService } from './resolvers/resolverService'

/** Fee of a created swap's own deposit transaction, when this account sends it from an
 * EVM source. Before a swap exists the form can only price a plain transfer, and a
 * contract-call deposit costs far more. Undefined whenever the actions name no such
 * transfer or the estimate is unavailable, so callers never block on it. */
export async function estimateDepositActionGas(actions: DepositAction[] | undefined, values: SwapFormValues, address: string, wallet: Wallet | undefined): Promise<GasWithToken | undefined> {
    const { from, fromAsset } = values
    if (!from || !fromAsset) return undefined
    const deposit = resolveDepositGasTransaction(actions, { network: from, token: fromAsset.symbol, address })
    if (!deposit) return undefined
    try {
        return await resolverService.getGasResolver().getGas({
            address, network: from, token: fromAsset, amount: deposit.action.amount, wallet, ...deposit.transaction,
        })
    } catch {
        // The gas providers report their own failures; an unknown fee is not a verdict.
        return undefined
    }
}

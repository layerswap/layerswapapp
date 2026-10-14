import type { ApiResponse, NetworkRoute, Wallet } from '@layerswap/widget-types'
import { usesDepository } from '@layerswap/widget-types'
import type { SwapFormValues } from '@/components/Pages/Swap/Form/SwapFormValues'
import { buildLimitsUrl } from '@/hooks/useFee'
import LayerSwapApiClient from './apiClients/layerSwapApiClient'
import { resolveExtendedRoutePlan } from './extendedRoutes/registry'
import { transformLimitsForExtendedRoute, type ExtendedLimits } from './extendedRoutes/transforms'
import { useBalanceStore } from '@/stores/balanceStore'
import { resolverService } from './resolvers/resolverService'
import { calculatePresetAmount, isAmountPreset, resolvePresetAmount } from './amountPresets'

/** Fresh reads before creation. Never changes a created swap or its actions. */
export async function preparePresetAmount(values: SwapFormValues, address: string | undefined, wallet: Wallet | undefined, sourceRoutes: NetworkRoute[], useGasless: boolean, publishLimits?: (key: string, response: ApiResponse<ExtendedLimits>) => Promise<unknown>) {
    const { from, fromAsset, to, toAsset } = values
    if (!from || !fromAsset || !to || !toAsset) throw new Error('Select a route to use an amount preset.')
    const mode = isAmountPreset(values.amountMode) ? values.amountMode : 'max'
    const walletFlow = values.depositMethod === 'wallet'
    if (walletFlow && (!address || !wallet)) throw new Error('Connect your source wallet.')
    const plan = resolveExtendedRoutePlan({
        sourceNetworkName: from.name, sourceTokenSymbol: fromAsset.symbol,
        destinationNetworkName: to.name, destinationTokenSymbol: toAsset.symbol,
        sourceAmount: values.amount, availableRoutes: sourceRoutes,
    })
    const api = new LayerSwapApiClient()
    const limitsUrl = buildLimitsUrl({
        sourceNetwork: plan?.mapping.real.networkName ?? from.name,
        sourceToken: plan?.mapping.real.tokenSymbol ?? fromAsset.symbol,
        destinationNetwork: to.name, destinationToken: toAsset.symbol,
        destinationAddress: values.destination_address, refuel: values.refuel,
        useDepositAddress: plan ? !usesDepository(plan.mapping.provider) : !walletFlow,
        useFrontendSwap: true, useGasless: !plan && useGasless,
    })
    const [balanceData, limitsResponse] = await Promise.all([
        walletFlow ? useBalanceStore.getState().fetchBalance(address!, from, { ignoreCache: true }) : Promise.resolve(undefined),
        api.fetcher(limitsUrl),
    ])
    const limits: ExtendedLimits | undefined = plan
        ? transformLimitsForExtendedRoute(limitsResponse?.data, plan.mapping)
        : limitsResponse?.data
    if (!limits || !Number.isFinite(limits.min_amount) || !Number.isFinite(limits.max_amount))
        throw new Error('Could not refresh the route limits. Try again.')
    // The resumed live controller must use the same limits that revised the draft.
    await publishLimits?.(limitsUrl, limitsResponse)
    if (!walletFlow) {
        if (mode === 'half') throw new Error('Connect your source wallet to use 50%.')
        const reviewed = Number(values.amount)
        return reviewed >= limits.min_amount && reviewed <= limits.max_amount
            ? values.amount!
            : resolvePresetAmount(mode, limits.max_amount, limits.min_amount, fromAsset.decimals)
    }
    const amount = await calculatePresetAmount({
        mode, minimum: limits.min_amount,
        network: from, token: fromAsset, probeAmount: values.amount, preserveAmount: true,
        balance: balanceData?.balances?.find(b => b.network === from.name && b.token === fromAsset.symbol),
        limit: limits?.max_amount,
        estimateGas: async amount => resolverService.getGasResolver().getGas({ address: address!, network: from, token: fromAsset, amount, wallet }),
    })
    if (Number(amount) <= 0 || (limits && Number(amount) < limits.min_amount))
        throw new Error('Your available balance is below the minimum swap amount.')
    return amount
}

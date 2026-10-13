import type { NetworkRoute, Wallet } from '@layerswap/widget-types'
import { usesDepository } from '@layerswap/widget-types'
import type { SwapFormValues } from '@/components/Pages/Swap/Form/SwapFormValues'
import { buildLimitsUrl } from '@/hooks/useFee'
import LayerSwapApiClient from './apiClients/layerSwapApiClient'
import { resolveExtendedRoutePlan } from './extendedRoutes/registry'
import { transformLimitsForExtendedRoute, type ExtendedLimits } from './extendedRoutes/transforms'
import { useBalanceStore } from '@/stores/balanceStore'
import { resolverService } from './resolvers/resolverService'
import { calculateMaxAmount } from './maxAmount'

/** Fresh reads before creation. Never changes a created swap or its actions. */
export async function prepareMaxAmount(values: SwapFormValues, address: string, wallet: Wallet, sourceRoutes: NetworkRoute[], useGasless: boolean) {
    const { from, fromAsset, to, toAsset } = values
    if (!from || !fromAsset || !to || !toAsset) throw new Error('Select a route to use Max.')
    const plan = resolveExtendedRoutePlan({
        sourceNetworkName: from.name, sourceTokenSymbol: fromAsset.symbol,
        destinationNetworkName: to.name, destinationTokenSymbol: toAsset.symbol,
        sourceAmount: values.amount, availableRoutes: sourceRoutes,
    })
    const api = new LayerSwapApiClient()
    const [balanceData, limitsResponse] = await Promise.all([
        useBalanceStore.getState().fetchBalance(address, from, { ignoreCache: true }),
        api.fetcher(buildLimitsUrl({
            sourceNetwork: plan?.mapping.real.networkName ?? from.name,
            sourceToken: plan?.mapping.real.tokenSymbol ?? fromAsset.symbol,
            destinationNetwork: to.name, destinationToken: toAsset.symbol,
            destinationAddress: values.destination_address, refuel: values.refuel,
            useDepositAddress: plan ? !usesDepository(plan.mapping.provider) : false,
            useFrontendSwap: true, useGasless: !plan && useGasless,
        })),
    ])
    const limits: ExtendedLimits | undefined = plan
        ? transformLimitsForExtendedRoute(limitsResponse?.data, plan.mapping)
        : limitsResponse?.data
    const amount = await calculateMaxAmount({
        network: from, token: fromAsset, probeAmount: values.amount, preserveAmount: true,
        balance: balanceData?.balances?.find(b => b.network === from.name && b.token === fromAsset.symbol),
        limit: limits?.max_amount,
        estimateGas: async amount => resolverService.getGasResolver().getGas({ address, network: from, token: fromAsset, amount, wallet }),
    })
    if (Number(amount) <= 0 || (limits && Number(amount) < limits.min_amount))
        throw new Error('Your available balance is below the minimum swap amount.')
    return amount
}

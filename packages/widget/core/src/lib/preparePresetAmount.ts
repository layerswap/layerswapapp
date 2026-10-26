import type { ApiResponse, NetworkRoute, Wallet } from '@layerswap/widget-types'
import { usesDepository } from '@layerswap/widget-types'
import type { SwapFormValues } from '@/components/Pages/Swap/Form/SwapFormValues'
import { buildLimitsUrl } from '@/hooks/useFee'
import LayerSwapApiClient from './apiClients/layerSwapApiClient'
import { resolveExtendedRoutePlan } from './extendedRoutes/registry'
import { transformLimitsForExtendedRoute, type ExtendedLimits } from './extendedRoutes/transforms'
import { useBalanceStore } from '@/stores/balanceStore'
import { resolverService } from './resolvers/resolverService'
import { amountText, calculatePresetAmount, isAmountPreset, isWalletAmountFlow, supportsLiveAmountPreset } from './amountPresets'

/** Fresh reads before creation. Never changes a created swap or its actions. */
export async function preparePresetAmount(values: SwapFormValues, address: string | undefined, wallet: Wallet | undefined, sourceRoutes: NetworkRoute[], useGasless: boolean, publishLimits?: (key: string, response: ApiResponse<ExtendedLimits>) => Promise<unknown>) {
    if (!isWalletAmountFlow(values)) return values.amount ?? ''
    const { from, fromAsset, to, toAsset } = values
    if (!from || !fromAsset || !to || !toAsset) throw new Error('Select a route to use an amount preset.')
    const mode = isAmountPreset(values.amountMode) ? values.amountMode : 'max'
    if (!address || !wallet) throw new Error('Connect your source wallet.')
    if (!supportsLiveAmountPreset(from, fromAsset))
        throw new Error('Live amount updates are unavailable for this asset. Select an amount again.')
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
        useDepositAddress: plan ? !usesDepository(plan.mapping.provider) : false,
        useFrontendSwap: true, useGasless: !plan && useGasless,
    })
    const estimateGas = async (amount: number) => resolverService.getGasResolver().getGas({ address, network: from, token: fromAsset, amount, wallet })
    // The first estimate is for the reviewed amount whenever it fits the fresh bounds.
    // Start it alongside the reads instead of after them; a mismatch costs one spare read.
    const reviewed = Number(amountText(Number(values.amount), fromAsset.decimals))
    const eager = Number.isFinite(reviewed) && reviewed > 0 ? { amount: reviewed, estimate: estimateGas(reviewed) } : undefined
    eager?.estimate.catch(() => { /* surfaced where the estimate is awaited */ })
    const [balanceData, limitsResponse] = await Promise.all([
        useBalanceStore.getState().fetchBalance(address, from, { ignoreCache: true }),
        api.fetcher(limitsUrl),
    ])
    const limits: ExtendedLimits | undefined = plan
        ? transformLimitsForExtendedRoute(limitsResponse?.data, plan.mapping)
        : limitsResponse?.data
    if (!limits || !Number.isFinite(limits.min_amount) || !Number.isFinite(limits.max_amount))
        throw new Error('Could not refresh the route limits. Try again.')
    // The resumed live controller must use the same limits that revised the draft.
    await publishLimits?.(limitsUrl, limitsResponse)
    const amount = await calculatePresetAmount({
        mode, minimum: limits.min_amount,
        network: from, token: fromAsset, probeAmount: values.amount, preserveAmount: true,
        balance: balanceData?.balances?.find(b => b.network === from.name && b.token === fromAsset.symbol),
        limit: limits?.max_amount,
        estimateGas: amount => eager && amount === eager.amount ? eager.estimate : estimateGas(amount),
    })
    if (Number(amount) <= 0 || (limits && Number(amount) < limits.min_amount))
        throw new Error('Your available balance is below the minimum swap amount.')
    return amount
}

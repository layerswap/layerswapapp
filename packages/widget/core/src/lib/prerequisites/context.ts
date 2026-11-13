import type { SwapPrerequisiteContext } from '@layerswap/widget-types'
import type { SwapBasicData } from '../apiClients/layerSwapApiClient'
import type { SwapFormValues } from '../../components/Pages/Swap/Form/SwapFormValues'
import { Address } from '../address/Address'

export function prerequisitesFromForm(values: SwapFormValues, receiveAmount?: number): SwapPrerequisiteContext | undefined {
    if (!values.to || !values.toAsset || !values.destination_address) return undefined
    if (!Address.isValid(values.destination_address, values.to)) return undefined
    return {
        source: values.from && values.fromAsset
            ? { network: values.from, token: values.fromAsset, amount: values.amount }
            : undefined,
        destination: { network: values.to, token: values.toAsset, address: values.destination_address },
        receiveAmount: Number(values.amount) > 0 && receiveAmount != null ? String(receiveAmount) : undefined,
    }
}

export function prerequisitesFromSwap(swap: SwapBasicData | undefined, receiveAmount?: number): SwapPrerequisiteContext | undefined {
    if (!swap) return undefined
    return {
        source: { network: swap.source_network, token: swap.source_token, amount: swap.requested_amount },
        destination: { network: swap.destination_network, token: swap.destination_token, address: swap.destination_address },
        receiveAmount: Number(swap.requested_amount) > 0 && receiveAmount != null ? String(receiveAmount) : undefined,
    }
}

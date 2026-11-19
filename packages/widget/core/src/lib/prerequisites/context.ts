import type { SwapPrerequisiteContext } from '@layerswap/widget-types'
import type { SwapFormValues } from '../../components/Pages/Swap/Form/SwapFormValues'
import { Address } from '../address/Address'

export function prerequisitesFromForm(values: SwapFormValues, receiveAmount?: number): SwapPrerequisiteContext | undefined {
    if (!values.to || !values.toAsset || !values.destination_address) return undefined
    if (!Address.isValid(values.destination_address, values.to)) return undefined
    return {
        destination: { network: values.to, token: values.toAsset, address: values.destination_address },
        receiveAmount: Number(values.amount) > 0 && receiveAmount != null ? String(receiveAmount) : undefined,
    }
}

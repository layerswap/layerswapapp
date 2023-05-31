import { FC } from "react"
import useSWR from 'swr'
import { useSettingsState } from "../../../context/settings"
import { useSwapDataState } from "../../../context/swap"
import Summary from "./Summary"
import { ApiResponse } from "../../../Models/ApiResponse"
import LayerSwapApiClient, { Fee } from "../../../lib/layerSwapApiClient"

const SwapSummary: FC = () => {
    const { layers, currencies } = useSettingsState()
    const { swap, withdrawType } = useSwapDataState()
    const {
        source_network: source_network_internal_name,
        source_exchange: source_exchange_internal_name,
        destination_exchange: destination_exchange_internal_name,
        destination_network: destination_network_internal_name,
        destination_network_asset
    } = swap
    const source_layer = layers.find(n => n.internal_name === (source_exchange_internal_name ?? source_network_internal_name))
    const destination_layer = layers.find(l => l.internal_name === (destination_exchange_internal_name ?? destination_network_internal_name))
    const asset = source_layer?.assets?.find(currency => currency?.asset === destination_network_asset)
    const currency = currencies?.find(c => c.asset === asset.asset)

    const params = {
        source_exchange: source_exchange_internal_name,
        source_network: source_network_internal_name,
        destination_exchange: destination_exchange_internal_name,
        destination_network: destination_network_internal_name,
        asset: destination_network_asset,
        refuel: swap?.refuel_amount ? true : false
    }

    const apiClient = new LayerSwapApiClient()
    const { data: feeData } = useSWR<ApiResponse<Fee[]>>([params], ([params]) => apiClient.GetFee(params), { dedupingInterval: 60000 })

    let fee: number
    if (swap?.fee) {
        fee = swap?.fee
    } else if (!swap?.fee && swap?.source_exchange) {
        fee = feeData.data[1].fee_amount
    } else {
        switch (withdrawType) {
            case 'wallet':
                fee = feeData?.data[0].fee_amount;
                break;
            case 'manually':
                fee = feeData?.data[1].fee_amount;
                break;
        }
    }

    return <Summary
        currency={currency}
        source={source_layer}
        destination={destination_layer}
        requestedAmount={swap?.requested_amount}
        destinationAddress={swap?.destination_address}
        refuelAmount={swap?.refuel_amount}
        fee={fee}
    />
}
export default SwapSummary
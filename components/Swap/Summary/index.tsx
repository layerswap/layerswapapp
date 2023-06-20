import { FC } from "react"
import useSWR from 'swr'
import { useSettingsState } from "../../../context/settings"
import { useSwapDataState } from "../../../context/swap"
import Summary from "./Summary"
import { ApiResponse } from "../../../Models/ApiResponse"
import LayerSwapApiClient, { Fee, WithdrawType } from "../../../lib/layerSwapApiClient"
import { useAccount } from "wagmi"
import { DepositType } from "../../../lib/NetworkSettings"

const SwapSummary: FC = () => {
    const { isConnected, address } = useAccount()
    const { layers, currencies } = useSettingsState()
    const { swap, withdrawType } = useSwapDataState()
    const {
        source_network: source_network_internal_name,
        source_exchange: source_exchange_internal_name,
        destination_exchange: destination_exchange_internal_name,
        destination_network: destination_network_internal_name,
        destination_network_asset,
        destination_address
    } = swap
    const source_layer = layers.find(n => n.internal_name === (source_exchange_internal_name ?? source_network_internal_name))
    const destination_layer = layers.find(l => l.internal_name === (destination_exchange_internal_name ?? destination_network_internal_name))
    const asset = source_layer?.assets?.find(currency => currency?.asset === destination_network_asset)
    const currency = currencies?.find(c => c.asset === asset.asset)

    const params = {
        source: source_layer?.internal_name,
        destination: destination_layer?.internal_name,
        asset: destination_network_asset,
        refuel: swap?.refuel_amount ? true : false
    }

    const apiClient = new LayerSwapApiClient()
    const { data: feeData } = useSWR<ApiResponse<Fee[]>>([params], ([params]) => apiClient.GetFee(params), { dedupingInterval: 60000 })

    let fee: number
    if (swap?.fee) {
        fee = swap?.fee
    } else if (withdrawType === WithdrawType.Wallet && (isConnected && address?.toLowerCase() === destination_address?.toLowerCase())) {
        fee = feeData?.data?.find(f => f?.deposit_type === DepositType.Wallet)?.fee_amount;
    } else {
        fee = feeData?.data?.find(f => f?.deposit_type === DepositType.Manual)?.fee_amount;
    }

    const requested_amount = feeData?.data[1]?.min_amount > swap?.requested_amount ? feeData?.data[1]?.min_amount : swap?.requested_amount

    return <Summary
        currency={currency}
        source={source_layer}
        destination={destination_layer}
        requestedAmount={requested_amount}
        destinationAddress={swap?.destination_address}
        refuelAmount={swap?.refuel_amount}
        fee={fee}
    />
}
export default SwapSummary
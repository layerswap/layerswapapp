import { FC } from "react"
import useSWR from 'swr'
import { useSettingsState } from "../../../context/settings"
import { useSwapDataState } from "../../../context/swap"
import Summary from "./Summary"
import { ApiResponse } from "../../../Models/ApiResponse"
import LayerSwapApiClient, { DepositType, Fee, TransactionType, WithdrawType } from "../../../lib/layerSwapApiClient"
import { useAccount } from "wagmi"
import { truncateDecimals } from "../../utils/RoundDecimals"
import { CanDoSweeplessTransfer } from "../../../lib/fees"

const SwapSummary: FC = () => {
    const { isConnected, address } = useAccount()
    const { layers, currencies, networks } = useSettingsState()
    const { swap, withdrawType, selectedAssetNetwork } = useSwapDataState()
    const {
        source_network: source_network_internal_name,
        source_exchange: source_exchange_internal_name,
        destination_exchange: destination_exchange_internal_name,
        destination_network: destination_network_internal_name,
        source_network_asset,
        destination_network_asset,
        destination_address
    } = swap
    const source_layer = layers?.find(n => n.internal_name === (source_exchange_internal_name ?? source_network_internal_name))
    const destination_layer = layers?.find(l => l.internal_name === (destination_exchange_internal_name ?? destination_network_internal_name))
    const asset = source_layer?.assets?.find(currency => currency?.asset === destination_network_asset)
    const currency = currencies?.find(c => c.asset === asset?.asset)

    const swapInputTransaction = swap?.transactions?.find(t => t.type === TransactionType.Input)
    const swapOutputTransaction = swap?.transactions?.find(t => t.type === TransactionType.Output)
    const swapRefuelTransaction = swap?.transactions?.find(t => t.type === TransactionType.Refuel)

    const params = {
        source: selectedAssetNetwork?.network?.internal_name,
        destination: destination_layer?.internal_name,
        source_asset: source_network_asset,
        destination_asset: destination_network_asset,
        refuel: swap?.has_refuel
    }

    const apiClient = new LayerSwapApiClient()
    const { data: feeData } = useSWR<ApiResponse<Fee[]>>([params], selectedAssetNetwork ? ([params]) => apiClient.GetFee(params) : null, { dedupingInterval: 60000 })

    let fee: number

    const walletTransferFee = feeData?.data?.find(f => f?.deposit_type === DepositType.Wallet)
    const manualTransferFee = feeData?.data?.find(f => f?.deposit_type === DepositType.Manual)

    if (swap?.fee && swapOutputTransaction) {
        fee = swap?.fee
    } else if (withdrawType === WithdrawType.Wallet && CanDoSweeplessTransfer(source_layer, address, destination_address)) {
        fee = walletTransferFee?.fee_amount;
    } else {
        fee = manualTransferFee?.fee_amount;
    }

    const requested_amount = swapInputTransaction?.amount ?? (withdrawType === WithdrawType.Wallet ?
        walletTransferFee?.min_amount > swap?.requested_amount ? walletTransferFee?.min_amount : swap?.requested_amount
        : manualTransferFee?.min_amount > swap?.requested_amount ? manualTransferFee?.min_amount : swap?.requested_amount)

    const destinationNetworkNativeAsset = currencies?.find(c => c.asset == networks.find(n => n.internal_name === destination_layer?.internal_name)?.native_currency);
    const refuelAmountInNativeCurrency = swap?.has_refuel && (swapRefuelTransaction?.amount ?? (networks.find(n => n.internal_name === destination_layer?.internal_name)?.refuel_amount_in_usd / destinationNetworkNativeAsset?.usd_price));
    const refuelAmountInSelectedCurrency = swap?.has_refuel && (networks.find(n => n.internal_name === destination_layer?.internal_name)?.refuel_amount_in_usd / currency?.usd_price) || 0;

    const receive_amount = swapOutputTransaction?.amount ?? Number(truncateDecimals(requested_amount - fee - refuelAmountInSelectedCurrency, currency?.precision))

    return <Summary
        currency={currency}
        source={source_layer}
        destination={destination_layer}
        requestedAmount={requested_amount}
        receiveAmount={receive_amount}
        destinationAddress={swap?.destination_address}
        hasRefuel={swap?.has_refuel}
        refuelAmount={refuelAmountInNativeCurrency}
        fee={fee}
        exchange_account_connected={swap?.exchange_account_connected}
        exchange_account_name={swap?.exchange_account_name}
    />
}
export default SwapSummary
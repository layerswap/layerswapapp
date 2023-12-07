import { FC } from "react"
import useSWR from 'swr'
import { useSettingsState } from "../../../context/settings"
import { useSwapDataState } from "../../../context/swap"
import Summary from "./Summary"
import { ApiResponse } from "../../../Models/ApiResponse"
import LayerSwapApiClient, { DepositType, Fee, TransactionType, WithdrawType } from "../../../lib/layerSwapApiClient"
import useWalletTransferOptions from "../../../hooks/useWalletTransferOptions"
import { useFee } from "../../../context/feeContext"

const SwapSummary: FC = () => {
    const { layers } = useSettingsState()
    const { swap, withdrawType, selectedAssetNetwork } = useSwapDataState()
    const {
        source_network: source_network_internal_name,
        source_exchange: source_exchange_internal_name,
        destination_exchange: destination_exchange_internal_name,
        destination_network: destination_network_internal_name,
        source_network_asset,
        destination_network_asset,
    } = swap || {}

    const { canDoSweepless, ready } = useWalletTransferOptions()

    const params = {
        source: source_network_internal_name,
        destination: destination_exchange_internal_name ?? destination_network_internal_name,
        source_asset: source_network_asset,
        destination_asset: destination_network_asset,
        refuel: swap?.has_refuel
    }

    const { fee: feeData, minAllowedAmount } = useFee()

    const source_layer = layers.find(n => n.internal_name === (source_exchange_internal_name ?? source_network_internal_name))
    const asset = source_layer?.assets?.find(currency => currency?.asset === destination_network_asset)
    const destination_layer = layers?.find(l => l.internal_name === (destination_exchange_internal_name ?? destination_network_internal_name))

    if (!swap || !source_layer || !asset || !destination_layer) {
        return <></>
    }

    const swapInputTransaction = swap?.transactions?.find(t => t.type === TransactionType.Input)
    const swapOutputTransaction = swap?.transactions?.find(t => t.type === TransactionType.Output)
    const swapRefuelTransaction = swap?.transactions?.find(t => t.type === TransactionType.Refuel)

    let fee: number | undefined
    let min_amount: number | undefined

    const walletTransferFee = feeData?.walletFee;
    const manualTransferFee = feeData?.manualFee;

    if (ready) {
        if (withdrawType === WithdrawType.Wallet && canDoSweepless) {
            fee = walletTransferFee;
            min_amount = minAllowedAmount;
        } else {
            fee = manualTransferFee;
            min_amount = minAllowedAmount;
        }
    }

    if (swap?.fee && swapOutputTransaction) {
        fee = swap?.fee
    }

    const requested_amount = (swapInputTransaction?.amount ??
        (Number(min_amount) > Number(swap.requested_amount) ? min_amount : swap.requested_amount)) || undefined

    const destinationNetworkNativeAsset = layers.find(n => n.internal_name === destination_layer?.internal_name)?.assets.find(a => a.is_native);
    const refuel_amount_in_usd = Number(destination_layer?.refuel_amount_in_usd)
    const native_usd_price = Number(destinationNetworkNativeAsset?.usd_price)
    const currency_usd_price = Number(asset?.usd_price)

    const refuelAmountInNativeCurrency = swap?.has_refuel
        ? ((swapRefuelTransaction?.amount ??
            (refuel_amount_in_usd / native_usd_price))) : undefined;

    const refuelAmountInSelectedCurrency = swap?.has_refuel &&
        (refuel_amount_in_usd / currency_usd_price);

    const receive_amount = fee != undefined ? (swapOutputTransaction?.amount
        ?? (Number(requested_amount) - fee - Number(refuelAmountInSelectedCurrency)))
        : undefined

    return <Summary
        currency={asset}
        source={source_layer}
        destination={destination_layer}
        requestedAmount={requested_amount as number}
        receiveAmount={receive_amount}
        destinationAddress={swap.destination_address}
        hasRefuel={swap?.has_refuel}
        refuelAmount={refuelAmountInNativeCurrency}
        fee={fee}
        exchange_account_connected={swap?.exchange_account_connected}
        exchange_account_name={swap?.exchange_account_name}
    />
}
export default SwapSummary
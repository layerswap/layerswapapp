import { FC, useEffect, useMemo } from "react"
import { useSettingsState } from "../../../context/settings"
import { useSwapDataState } from "../../../context/swap"
import Summary from "./Summary"
import { TransactionType, WithdrawType } from "../../../lib/layerSwapApiClient"
import useWalletTransferOptions from "../../../hooks/useWalletTransferOptions"
import { useFee } from "../../../context/feeContext"
import shortenAddress, { shortenEmail } from "../../utils/ShortenAddress"
import KnownInternalNames from "../../../lib/knownIds"
import useWallet from "../../../hooks/useWallet"
import { useQueryState } from "../../../context/query"

const SwapSummary: FC = () => {
    const { layers, exchanges } = useSettingsState()
    const { swap, withdrawType } = useSwapDataState()
    const { getWithdrawalProvider: getProvider } = useWallet()
    const {
        hideFrom,
        account,
    } = useQueryState()

    const { canDoSweepless, isContractWallet } = useWalletTransferOptions()
    const { fee: feeData, valuesChanger, minAllowedAmount } = useFee()

    const source_layer = layers.find(n => n.internal_name === swap?.source_network.name)
    const sourceAsset = source_layer?.assets?.find(currency => currency?.symbol === swap?.source_token.symbol)
    const destination_layer = layers?.find(l => l.internal_name === swap?.destination_token.symbol)
    const destinationAsset = destination_layer?.assets?.find(currency => currency?.symbol === swap?.destination_token.symbol)
    const sourceExchange = exchanges.find(e => e.internal_name === swap?.source_exchange?.name)
    const destExchange = exchanges.find(e => e.internal_name === swap?.destination_exchange?.name)

    const provider = useMemo(() => {
        return source_layer && getProvider(source_layer)
    }, [source_layer, getProvider])

    const wallet = provider?.getConnectedWallet()

    useEffect(() => {
        valuesChanger({
            amount: swap?.requested_amount.toString(),
            destination_address: swap?.destination_address,
            from: source_layer,
            to: destination_layer,
            fromCurrency: sourceAsset,
            toCurrency: destinationAsset,
            refuel: !!swap?.refuel,
        })
    }, [swap])

    if (!swap || !source_layer || !sourceAsset || !destinationAsset || !destination_layer) {
        return <></>
    }

    const swapInputTransaction = swap?.transactions?.find(t => t.type === TransactionType.Input)
    const swapOutputTransaction = swap?.transactions?.find(t => t.type === TransactionType.Output)
    const swapRefuelTransaction = swap?.transactions?.find(t => t.type === TransactionType.Refuel)

    let min_amount: number | undefined

    if (isContractWallet?.ready) {
        if (withdrawType === WithdrawType.Wallet && canDoSweepless) {
            min_amount = minAllowedAmount;
        } else {
            min_amount = minAllowedAmount;
        }
    }

    const requested_amount = (swapInputTransaction?.amount ??
        (Number(min_amount) > Number(swap.requested_amount) ? min_amount : swap.requested_amount)) || undefined

    const receiveAmount = withdrawType === WithdrawType.Wallet ? feeData?.walletReceiveAmount : feeData?.manualReceiveAmount
    const calculatedReceiveAmount = swapOutputTransaction?.amount ?? receiveAmount

    const refuelAmountInNativeCurrency = !!swap?.refuel
        ? ((swapRefuelTransaction?.amount ??
            (feeData?.refuelAmount))) : undefined;

    let sourceAccountAddress = ""
    if (hideFrom && account) {
        sourceAccountAddress = shortenAddress(account);
    }
    else if (swapInputTransaction?.from) {
        sourceAccountAddress = shortenAddress(swapInputTransaction?.from);
    }
    else if (wallet) {
        sourceAccountAddress = shortenAddress(wallet.address);
    }
    else if (source_layer?.internal_name === KnownInternalNames.Exchanges.Coinbase && swap?.exchange_account_connected) {
        sourceAccountAddress = shortenEmail(swap?.exchange_account_name, 10);
    }
    else if (sourceExchange) {
        sourceAccountAddress = "Exchange"
    }
    else {
        sourceAccountAddress = "Network"
    }

    return <Summary
        sourceCurrency={sourceAsset}
        destinationCurrency={destinationAsset}
        source={source_layer}
        sourceExchange={sourceExchange}
        destination={destination_layer}
        destExchange={destExchange}
        requestedAmount={requested_amount}
        receiveAmount={calculatedReceiveAmount}
        destinationAddress={swap.destination_address}
        hasRefuel={!!swap?.refuel}
        refuelAmount={refuelAmountInNativeCurrency}
        exchange_account_connected={swap?.exchange_account_connected}
        exchange_account_name={swap?.exchange_account_name}
        sourceAccountAddress={sourceAccountAddress}
    />
}
export default SwapSummary
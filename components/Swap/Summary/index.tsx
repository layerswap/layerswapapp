import { FC, useMemo } from "react"
import { useSwapDataState } from "@/context/swap"
import Summary from "./Summary"
import { TransactionType } from "@/lib/apiClients/layerSwapApiClient"
import { shortenEmail } from "@/components/utils/ShortenAddress"
import KnownInternalNames from "@/lib/knownIds"
import { useQueryState } from "@/context/query"
import useWallet from "@/hooks/useWallet"

const SwapSummary: FC = () => {

    const {
        hideFrom,
        account,
    } = useQueryState()

    const { swapBasicData, swapDetails, quote, refuel } = useSwapDataState()
    const { source_network, destination_network, source_token, destination_token, source_exchange } = swapBasicData || {}
    const { provider } = useWallet(source_network, "withdrawal")
    const selectedSourceAccount = useMemo(() => provider?.activeWallet, [provider]);

    if (!swapBasicData || !source_network || !source_token || !destination_token || !destination_network) {
        return <></>
    }

    const swapInputTransaction = swapDetails?.transactions?.find(t => t.type === TransactionType.Input)
    const swapOutputTransaction = swapDetails?.transactions?.find(t => t.type === TransactionType.Output)

    const requested_amount = (swapInputTransaction?.amount ?? swapBasicData.requested_amount) || undefined

    const receiveAmount = quote?.receive_amount
    const calculatedReceiveAmount = swapOutputTransaction?.amount ?? receiveAmount
    let sourceAccountAddress = ""
    if (hideFrom && account) {
        sourceAccountAddress = account;
    }
    else if (swapInputTransaction?.from) {
        sourceAccountAddress = swapInputTransaction?.from;
    }
    else if (selectedSourceAccount?.address) {
        sourceAccountAddress = selectedSourceAccount.address;
    }
    else if (source_network?.name === KnownInternalNames.Exchanges.Coinbase && swapDetails?.exchange_account_connected) {
        sourceAccountAddress = shortenEmail(swapDetails?.exchange_account_name, 10);
    }
    else if (source_exchange) {
        sourceAccountAddress = "Exchange"
    }
    else {
        sourceAccountAddress = "Network"
    }

    return <Summary
        sourceCurrency={source_token}
        destinationCurrency={destination_token}
        source={source_network}
        sourceExchange={source_exchange}
        destination={destination_network}
        destExchange={undefined}
        requestedAmount={requested_amount}
        receiveAmount={calculatedReceiveAmount}
        destinationAddress={swapBasicData.destination_address}
        refuel={refuel}
        exchange_account_connected={!!swapDetails?.exchange_account_connected}
        exchange_account_name={swapDetails?.exchange_account_name}
        sourceAccountAddress={sourceAccountAddress}
    />
}
export default SwapSummary
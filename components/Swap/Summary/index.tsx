import { FC, useEffect, useMemo } from "react"
import { useSettingsState } from "../../../context/settings"
import { useSwapDataState } from "../../../context/swap"
import Summary from "./Summary"
import { TransactionType, WithdrawType } from "../../../lib/layerSwapApiClient"
import useWalletTransferOptions from "../../../hooks/useWalletTransferOptions"
import shortenAddress, { shortenEmail } from "../../utils/ShortenAddress"
import KnownInternalNames from "../../../lib/knownIds"
import useWallet from "../../../hooks/useWallet"
import { useQueryState } from "../../../context/query"

const SwapSummary: FC = () => {
    const { exchanges } = useSettingsState()
    const { swapResponse: swapResponse, withdrawType } = useSwapDataState()
    const { swap, quote: swapQuote, refuel: swapRefuel } = swapResponse || {}
    const { getWithdrawalProvider: getProvider } = useWallet()
    const {
        hideFrom,
        account,
    } = useQueryState()

    const { source_network, destination_network, source_token, destination_token } = swap || {}

    const sourceExchange = exchanges.find(e => e.name === swap?.source_exchange?.name)
    const destExchange = exchanges.find(e => e.name === swap?.destination_exchange?.name)

    const provider = useMemo(() => {
        return source_network && getProvider(source_network)
    }, [source_network, getProvider])

    const wallet = provider?.getConnectedWallet()

    if (!swap || !source_network || !source_token || !destination_token || !destination_network) {
        return <></>
    }

    const swapInputTransaction = swap?.transactions?.find(t => t.type === TransactionType.Input)
    const swapOutputTransaction = swap?.transactions?.find(t => t.type === TransactionType.Output)
    const swapRefuelTransaction = swap?.transactions?.find(t => t.type === TransactionType.Refuel)

    const requested_amount = (swapInputTransaction?.amount ?? swap.requested_amount) || undefined

    const receiveAmount = swapQuote?.receive_amount
    const calculatedReceiveAmount = swapOutputTransaction?.amount ?? receiveAmount

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
    else if (source_network?.name === KnownInternalNames.Exchanges.Coinbase && swap?.exchange_account_connected) {
        sourceAccountAddress = shortenEmail(swap?.exchange_account_name, 10);
    }
    else if (sourceExchange) {
        sourceAccountAddress = "Exchange"
    }
    else {
        sourceAccountAddress = "Network"
    }

    return <Summary
        sourceCurrency={source_token}
        destinationCurrency={destination_token}
        source={source_network}
        sourceExchange={sourceExchange}
        destination={destination_network}
        destExchange={destExchange}
        requestedAmount={requested_amount}
        receiveAmount={calculatedReceiveAmount}
        destinationAddress={swap.destination_address}
        refuel={swapRefuel}
        exchange_account_connected={swap?.exchange_account_connected}
        exchange_account_name={swap?.exchange_account_name}
        sourceAccountAddress={sourceAccountAddress}
    />
}
export default SwapSummary
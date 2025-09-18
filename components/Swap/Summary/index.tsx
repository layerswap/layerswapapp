import { FC, useMemo } from "react"
import { useSwapDataState } from "@/context/swap"
import Summary from "./Summary"
import { SwapResponse, TransactionType } from "@/lib/apiClients/layerSwapApiClient"
import { shortenEmail } from "@/components/utils/ShortenAddress"
import KnownInternalNames from "@/lib/knownIds"
import { useQueryState } from "@/context/query"
import useWallet from "@/hooks/useWallet"
import { useSelectedAccount } from "@/context/balanceAccounts"

const SwapSummary: FC = () => {

    const {
        hideFrom,
        account,
    } = useQueryState()

    const { swapBasicData, swapDetails, quote, refuel, quoteIsLoading } = useSwapDataState()

    const { source_network, destination_network, source_token, destination_token, source_exchange } = swapBasicData || {}
    const { provider } = useWallet(source_network, "withdrawal")
    const selectedSourceAccount = useSelectedAccount("from", provider?.name);

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

    const swapData = {
        swap: {
            ...swapBasicData,
            requested_amount: requested_amount!
        },
        quote: {
            quote: quote!,
            refuel
        },
        sourceAccountAddress,
        receiveAmount: calculatedReceiveAmount
    }


    return <Summary
        {...swapData}
        quoteIsLoading={quoteIsLoading}
    />
}
export default SwapSummary
import { FC } from "react"
import { ActionData } from "../../Common/sharedTypes"
import { BaseError } from 'viem'
import ActionMessages from "../../../messages/TransactionMessages";
import resolveError from "./resolveError";

type TransactionMessageProps = {
    wait?: ActionData,
    transaction: ActionData,
    applyingTransaction: boolean,
    activeAddress: string | undefined
    selectedSourceAddress: string | undefined
    swapError?: string | null | undefined
    sourceNetwork: { name: string }
}

const TransactionMessage: FC<TransactionMessageProps> = ({
    wait, transaction, applyingTransaction, activeAddress, selectedSourceAddress, swapError, sourceNetwork
}) => {
    const transactionResolvedError = resolveError(transaction?.error as BaseError)
    const hasError = transaction?.isError || wait?.isError

    if (wait?.isPending || applyingTransaction) {
        return <ActionMessages.TransactionInProgressMessage />
    }
    else if (transaction?.isPending || applyingTransaction) {
        return <ActionMessages.ConfirmTransactionMessage />
    }
    else if (transaction?.isError && transactionResolvedError === "insufficient_funds") {
        return <ActionMessages.InsufficientFundsMessage />
    }
    else if (transaction?.isError && transactionResolvedError === "transaction_rejected") {
        return <ActionMessages.TransactionRejectedMessage />
    }
    else if (swapError) {
        return <ActionMessages.SwapErrorMessage message={swapError} />
    }
    //TODO: this is old we mihght need to remove it, as now the selected account is the active one
    else if (transaction.isError && activeAddress && selectedSourceAddress && (activeAddress?.toLowerCase() !== selectedSourceAddress?.toLowerCase())) {
        return <ActionMessages.WalletMismatchMessage address={selectedSourceAddress} network={sourceNetwork} />
    }
    else if (hasError) {
        const unexpectedError = transaction?.error?.['data']?.message || transaction?.error
            || wait?.error

        return <ActionMessages.UexpectedErrorMessage message={unexpectedError?.message} />
    }
    else return <></>
}

export default TransactionMessage

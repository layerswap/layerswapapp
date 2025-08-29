import { FC } from "react"
import { ActionData } from "../../Common/sharedTypes"
import { BaseError } from 'viem'
import TransactionMessages from "../../../messages/TransactionMessages";
import resolveError from "./resolveError";
import { posthog } from "posthog-js";

type TransactionMessageProps = {
    wait?: ActionData,
    transaction: ActionData,
    applyingTransaction: boolean,
    activeAddress: string | undefined
    selectedSourceAddress: string | undefined
}

const TransactionMessage: FC<TransactionMessageProps> = ({
    wait, transaction, applyingTransaction, activeAddress, selectedSourceAddress
}) => {
    const transactionResolvedError = resolveError(transaction?.error as BaseError)
    const hasError = transaction?.isError || wait?.isError

    if (wait?.isPending || applyingTransaction) {
        return <TransactionMessages.TransactionInProgressMessage />
    }
    else if (transaction?.isPending || applyingTransaction) {
        return <TransactionMessages.ConfirmTransactionMessage />
    }
    else if (transaction?.isError && transactionResolvedError === "insufficient_funds") {
        return <TransactionMessages.InsufficientFundsMessage />
    }
    else if (transaction?.isError && transactionResolvedError === "transaction_rejected") {
        return <TransactionMessages.TransactionRejectedMessage />
    }
    //TODO: this is old we mihght need to remove it, as now the selected account is the active one
    else if (transaction.isError && activeAddress && selectedSourceAddress && (activeAddress?.toLowerCase() !== selectedSourceAddress?.toLowerCase())) {
        return <TransactionMessages.WaletMismatchMessage address={selectedSourceAddress} />
    }
    else if (hasError) {
        const unexpectedError = transaction?.error?.['data']?.message || transaction?.error
            || wait?.error

        const renderingError = new Error(unexpectedError.message);
        renderingError.name = `SwapWithdrawalError`;
        renderingError.cause = unexpectedError;
        posthog.captureException('$exception', {
            name: renderingError.name,
            message: renderingError.message,
            stack: renderingError.stack,
            cause: renderingError.cause,
            where: 'swapWithdrawalError',
            severity: 'error',
            sessionId: posthog.get_distinct_id(),
        });

        return <TransactionMessages.UexpectedErrorMessage message={unexpectedError?.message} />
    }
    else return <></>
}

export default TransactionMessage

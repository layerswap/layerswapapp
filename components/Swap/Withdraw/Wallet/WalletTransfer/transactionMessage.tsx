import { FC } from "react"
import WalletMessage from "./message"
import resolveError from "./resolveError"
import { ActionData } from "./sharedTypes"
import { BaseError } from 'viem'
import { datadogRum } from '@datadog/browser-rum';

type TransactionMessageProps = {
    wait?: ActionData,
    transaction: ActionData,
    applyingTransaction: boolean
}

const TransactionMessage: FC<TransactionMessageProps> = ({
    wait, transaction, applyingTransaction
}) => {
    const transactionResolvedError = resolveError(transaction?.error as BaseError)
    const hasError = transaction?.isError || wait?.isError

    if (wait?.isPending || applyingTransaction) {
        return <TransactionInProgressMessage />
    }
    else if (transaction?.isPending || applyingTransaction) {
        return <ConfirmTransactionMessage />
    }
    else if (transaction?.isError && transactionResolvedError === 'insufficient_funds') {
        return <InsufficientFundsMessage />
    }
    else if (transaction?.isError && transactionResolvedError === 'transaction_rejected') {
        return <TransactionRejectedMessage />
    } else if (hasError) {
        const unexpectedError = transaction?.error?.['data']?.message || transaction?.error
            || wait?.error

        const renderingError = new Error(unexpectedError.message);
        renderingError.name = `SwapWithdrawalError`;
        renderingError.cause = unexpectedError;
        datadogRum.addError(renderingError);

        return <UexpectedErrorMessage message={unexpectedError?.message} />
    }
    else return <></>
}

const PreparingTransactionMessage: FC = () => {
    return <WalletMessage
        status="pending"
        header='Preparing the transaction'
        details='Will be ready to sign in a couple of seconds' />
}

const ConfirmTransactionMessage: FC = () => {
    return <WalletMessage
        status="pending"
        header='Confirm in wallet'
        details='Please confirm the transaction in your wallet' />
}

const TransactionInProgressMessage: FC = () => {
    return <WalletMessage
        status="pending"
        header='Transaction in progress'
        details='Waiting for your transaction to be published' />
}

const InsufficientFundsMessage: FC = () => {
    return <WalletMessage
        status="error"
        header='Insufficient funds'
        details='The balance of the connected wallet is not enough' />
}

const TransactionRejectedMessage: FC = () => {
    return <WalletMessage
        status="error"
        header='Transaction rejected'
        details={`You've rejected the transaction in your wallet. Click “Try again” to open the prompt again.`} />
}

const UexpectedErrorMessage: FC<{ message: string }> = ({ message }) => {
    return <WalletMessage
        status="error"
        header='Unexpected error'
        details={message}
        showInModal />
}

export default TransactionMessage
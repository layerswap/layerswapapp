import { FC } from "react"
import WalletMessage from "./message"
import resolveError from "./resolveError"
import { ActionData } from "./sharedTypes"
import { BaseError } from 'viem'

type TransactionMessageProps = {
    prepare: ActionData,
    wait: ActionData,
    transaction: ActionData,
    applyingTransaction: boolean,
}

const TransactionMessage: FC<TransactionMessageProps> = ({
    prepare, wait, transaction, applyingTransaction
}) => {
    const prepareResolvedError = resolveError(prepare?.error as BaseError)
    const transactionResolvedError = resolveError(transaction?.error as BaseError)
    const hasError = prepare?.isError || transaction?.isError || wait?.isError

    if (wait?.isLoading || applyingTransaction) {
        return <TransactionInProgressMessage />
    }
    else if (transaction?.isLoading || applyingTransaction) {
        return <ConfirmTransactionMessage />
    }
    else if (prepare?.isLoading) {
        return <PreparingTransactionMessage />
    }
    else if (prepare?.isError && prepareResolvedError === "insufficient_funds") {
        return <InsufficientFundsMessage />
    }
    else if (transaction?.isError && transactionResolvedError) {
        return <TransactionRejectedMessage />
    } else if (hasError) {
        const unexpectedError = prepare?.error
            || transaction?.error?.['data']?.message || transaction?.error
            || wait?.error
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
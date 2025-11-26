import { FC } from "react"
import { ActionMessages, ActionMessageType } from "../../messages/TransactionMessages"
import { ErrorHandler } from "@/lib/ErrorHandler"

export const ActionMessage: FC<{ error: Error | undefined, isLoading: boolean }> = ({ error, isLoading }) => {
    if (isLoading) {
        return <ActionMessages.ConfirmActionMessage />
    }
    else if (error?.name === ActionMessageType.TransactionRejected) {
        return <ActionMessages.TransactionRejectedMessage />
    }
    else if (error?.name === ActionMessageType.TransactionFailed) {
        return <ActionMessages.TransactionFailedMessage />
    }
    else if (error?.name === ActionMessageType.InsufficientFunds) {
        return <ActionMessages.InsufficientFundsMessage />
    }
    else if (error?.name === ActionMessageType.WaletMismatch) {
        return <ActionMessages.WaletMismatchMessage address={error?.message} />
    }
    else if (error?.name === ActionMessageType.DifferentAccountsNotAllowedError) {
        return <ActionMessages.DifferentAccountsNotAllowedError network={error?.message} />
    }
    else if (error) {
        if (!error.message) return <ActionMessages.UnexpectedErrorMessage message={'Something went wrong'} />

        const err = error as Error;
        ErrorHandler({ 
            type: "SwapWithdrawalError", 
            message: err.message,
            name: err.name,
            stack: err.stack,
            cause: err.cause
        });
        return <ActionMessages.UnexpectedErrorMessage message={error.message} />
    }
    else return <></>
}
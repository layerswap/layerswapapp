import { FC, useEffect } from "react"
import { ActionMessages, ActionMessageType } from "../../messages/TransactionMessages"
import { ErrorHandler } from "@/lib/ErrorHandler"

export const ActionMessage: FC<{ error: Error | undefined, isLoading: boolean }> = ({ error, isLoading }) => {

    useEffect(() => {
        if (error && (error?.name === ActionMessageType.UnexpectedErrorMessage
            || !Object.values(ActionMessageType).includes(error.name as ActionMessageType)
        )) {
            ErrorHandler({
                type: "SwapWithdrawalError",
                message: error.message,
                name: error.name,
                stack: error.stack,
                cause: error.cause
            });
        }
    }, [error])

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
        return <ActionMessages.UnexpectedErrorMessage message={error.message} />
    }
    else return <></>
}
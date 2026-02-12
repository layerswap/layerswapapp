import { FC, useEffect } from "react"
import { ActionMessages, ActionMessageType } from "../../messages/TransactionMessages"
import { ErrorHandler } from "@/lib/ErrorHandler"
import { Network } from "@/Models"

export const ActionMessage: FC<{ error: Error | undefined, isLoading: boolean, selectedSourceAddress: string, sourceNetwork: Network }> = ({ error, isLoading, selectedSourceAddress, sourceNetwork }) => {

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
        return <ActionMessages.WaletMismatchMessage address={selectedSourceAddress} network={sourceNetwork} />
    }
    else if (error?.name === ActionMessageType.DifferentAccountsNotAllowedError) {
        return <ActionMessages.DifferentAccountsNotAllowedError network={error?.message} />
    }
    else if (error) {
        if (!error.message) return <ActionMessages.UnexpectedErrorMessage />
        return <ActionMessages.UnexpectedErrorMessage />
    }
    else return <></>
}
import { FC } from "react"
import { ActionMessages, ActionMessageType } from "../../messages/TransactionMessages"

export const ActionMessage: FC<{ error: Error | undefined, isLoading: boolean }> = ({ error, isLoading }) => {
    console.log(
        "message ", error?.message,
        "name ", error?.name
    )
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

        const swapWithdrawalError = new Error(error?.message);
        swapWithdrawalError.name = `SwapWithdrawalError`;
        swapWithdrawalError.cause = error;
        // posthog.captureException('$exception', {
        //     name: swapWithdrawalError.name,
        //     message: swapWithdrawalError.message,
        //     $layerswap_exception_type: "Swap Withdrawal Error",
        //     stack: swapWithdrawalError.stack,
        //     cause: swapWithdrawalError.cause,
        //     where: 'swapWithdrawalError',
        //     severity: 'error',
        // });
        return <ActionMessages.UnexpectedErrorMessage message={error?.message} />
    }
    else return <></>
}
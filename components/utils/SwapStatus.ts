import { PublishedSwapTransactions, PublishedSwapTransactionStatus, SwapItem } from "../../lib/layerSwapApiClient";
import { SwapStatus } from "../../Models/SwapStatus";
import { SwapStep, SwapWithdrawalStep } from "../../Models/Wizard";

export const GetSwapStatusStep = (swap: SwapItem): SwapWithdrawalStep => {

    const swapStatus = swap?.status;
    if ((swapStatus == SwapStatus.UserTransferPending
        && (swap.has_sucessfull_published_tx
            || swap.input_transaction
            || swap.has_pending_deposit))
        || (swapStatus == SwapStatus.LsTransferPending))
        return SwapWithdrawalStep.SwapProcessing
    else if (swapStatus == SwapStatus.UserTransferPending)
        return SwapWithdrawalStep.OffRampWithdrawal
    else if (swapStatus == SwapStatus.Completed)
        return SwapWithdrawalStep.Success
    else if (swapStatus == SwapStatus.Failed || swapStatus == SwapStatus.Cancelled || swapStatus === SwapStatus.Expired)
        return SwapWithdrawalStep.Failed
    else if (swapStatus == SwapStatus.UserTransferDelayed)
        return SwapWithdrawalStep.Delay
}



export const GetSwapStep = (swap: SwapItem): SwapStep => {

    const swapStatus = swap?.status;

    const data: PublishedSwapTransactions = JSON.parse(localStorage.getItem('swapTransactions') || "{}")
    const txForSwap = data?.[swap.id];

    if (swapStatus == SwapStatus.Completed)
        return SwapStep.Success;
    else if (swapStatus == SwapStatus.Failed || swapStatus == SwapStatus.Cancelled || swapStatus === SwapStatus.Expired)
        return SwapStep.Failed;
    else if (swapStatus == SwapStatus.UserTransferDelayed)
        return SwapStep.Delay;
    else if (swapStatus == SwapStatus.LsTransferPending)
        return SwapStep.LSTransferPending;
    else if (swap.input_transaction && swapStatus == SwapStatus.UserTransferPending)
        return SwapStep.TransactionDetected;
    else if (txForSwap && !swap.input_transaction)
        return SwapStep.TransactionDone;
    else
        return SwapStep.UserTransferPending
}

export const ResolvePollingInterval = (step: SwapStep): 15000 | 0 => {
    switch (step) {
        case SwapStep.Failed:
        case SwapStep.Delay:
        case SwapStep.Success:
            return 0;
        default:
            return 15000
    }
}
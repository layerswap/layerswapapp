import KnownInternalNames from "../../lib/knownIds";
import { SwapItem } from "../../lib/layerSwapApiClient";
import { SwapStatus } from "../../Models/SwapStatus";
import { SwapWithdrawalStep } from "../../Models/Wizard";

export const GetSwapStatusStep = (swap: SwapItem): SwapWithdrawalStep => {
    const swapStatus = swap?.status;
    if (swapStatus == SwapStatus.UserTransferPending && swap.has_pending_deposit && !swap.input_transaction)
        return SwapWithdrawalStep.DepositPending
    else if (swapStatus == SwapStatus.UserTransferPending && swap.input_transaction)
        return SwapWithdrawalStep.TransferConfirmation
    else if (swapStatus == SwapStatus.LsTransferPending)
        return SwapWithdrawalStep.OutputTransferProccessing
    else if (swapStatus == SwapStatus.UserTransferPending)
        return swap.source_exchange ? SwapWithdrawalStep.Withdrawal : SwapWithdrawalStep.OffRampWithdrawal
    else if (swapStatus == SwapStatus.Completed)
        return SwapWithdrawalStep.Success
    else if (swapStatus == SwapStatus.Failed || swapStatus == SwapStatus.Cancelled || swapStatus === SwapStatus.Expired)
        return SwapWithdrawalStep.Failed
    else if (swapStatus == SwapStatus.UserTransferDelayed)
        return SwapWithdrawalStep.Delay
}
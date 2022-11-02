import { SwapItemResponse } from "../../lib/layerSwapApiClient";
import { SwapStatus } from "../../Models/SwapStatus";
import { SwapWithdrawalStep } from "../../Models/Wizard";

export const GetSwapStatusStep = (swap: SwapItemResponse): SwapWithdrawalStep => {
    const swapStatus = swap?.data.status;
    if (swapStatus == SwapStatus.Completed)
        return SwapWithdrawalStep.Success
    else if (swapStatus == SwapStatus.Failed || swapStatus == SwapStatus.Cancelled || swapStatus === SwapStatus.Expired)
        return SwapWithdrawalStep.Failed
    else if (swapStatus == SwapStatus.LsTransferPending)
        return SwapWithdrawalStep.Processing
}
import { SwapStatus } from "../../Models/SwapStatus";

export const ResolvePollingInterval = (step: SwapStatus): 10000 | 0 => {
    switch (step) {
        case SwapStatus.Failed:
        case SwapStatus.UserTransferDelayed:
        case SwapStatus.Completed:
            return 0;
        default:
            return 10000
    }
}
import { SwapStatus } from "../../Models/SwapStatus";

export const ResolvePollingInterval = (step: SwapStatus): number => {
    switch (step) {
        case SwapStatus.Failed:
        case SwapStatus.UserTransferDelayed:
        case SwapStatus.Completed:
            return 0;
        default:
            return 7000;
    }
}
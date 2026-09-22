import { formatHmsClock, msToParts } from '@/components/utils/formatTime';
import {
    TransactionType,
    type SwapDetails,
} from '@/lib/apiClients/layerSwapApiClient';
import { SwapStatus } from '@layerswap/widget-types';

export function ElapsedTime({
    swapDetails,
    elapsedMs,
}: {
    swapDetails: SwapDetails;
    elapsedMs: number;
}) {
    const formatted = formatHmsClock(msToParts(elapsedMs));
    const swapInputTransaction = swapDetails.transactions.find(
        (t) => t.type === TransactionType.Input,
    );

    if (swapDetails.status === SwapStatus.Completed) return null;

    if (!swapInputTransaction?.timestamp) {
        return (
            <div className="flex items-center justify-center space-x-1">
                <span className="text-secondary-text">
                    Transaction is publishing
                </span>
            </div>
        );
    }

    return (
        <div className="flex items-center justify-center space-x-1">
            <div className="text-secondary-text flex items-center">
                <span>Elapsed time:</span>
                <span className="text-primary-text ml-0.5">{formatted}</span>
            </div>
        </div>
    );
}

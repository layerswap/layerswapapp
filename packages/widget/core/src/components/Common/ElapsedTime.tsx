import { formatHmsClock, msToParts } from '@/components/utils/formatTime';
import {
    TransactionType,
    type SwapDetails,
} from '@/lib/apiClients/layerSwapApiClient';
import { Clock3 } from 'lucide-react';

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

    if (!swapInputTransaction?.timestamp) {
        return (
            <span className="text-xs text-secondary-text">Publishing…</span>
        );
    }

    return (
        <span
            className="inline-flex items-center gap-1.5 whitespace-nowrap text-xs text-secondary-text tabular-nums"
            role="timer"
            title="Elapsed time"
        >
            <Clock3 className="h-3.5 w-3.5" aria-hidden="true" />
            <span className="sr-only">Elapsed time:</span>
            <span>{formatted}</span>
        </span>
    );
}

import type { ReactNode } from 'react';
import type { TransferBlockedReasonCode } from '@layerswap/widget-types';
import { useSwapDataState } from '@/context/swap';
import { useTransferBlocked } from '@/hooks/useTransferBlocked';
import { lifecycleContextFromSwap, type SwapLifecycleContext } from '@/lib/swapLifecycle';

type TransferBlockProps = {
    reasonCode: TransferBlockedReasonCode;
    reason?: string;
    path: string;
    context?: SwapLifecycleContext;
    children: ReactNode;
    readOnly?: boolean;
};

/** Mount only in the branch that actually replaces or disables a transfer action.
 * Unrendered controller models cannot report a block through this boundary. */
export function TransferBlock(props: TransferBlockProps) {
    // Snapshot previews render the same controls without live providers or telemetry.
    if (props.readOnly) {
        return <>{props.children}</>;
    }
    return <ObservedTransferBlock {...props} />;
}

function ObservedTransferBlock({ reasonCode, reason, path, context, children }: TransferBlockProps) {
    const { swapBasicData, swapDetails } = useSwapDataState();
    useTransferBlocked(reasonCode, {
        ...(swapBasicData ? lifecycleContextFromSwap(swapBasicData, swapDetails) : undefined),
        ...context,
    }, path, reason);
    return <>{children}</>;
}

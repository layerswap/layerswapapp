import type { ReactNode } from 'react';
import type { SwapLifecycleStage, TransferBlockedReasonCode } from '@layerswap/widget-types';
import { useOptionalCallbacks } from '@/context/callbackProvider';
import { useSwapDataState } from '@/context/swap';
import { useTransferBlocked } from '@/hooks/useTransferBlocked';
import { lifecycleContextFromSwap, type SwapLifecycleContext } from '@/lib/swapLifecycle';

type TransferBlockProps = {
    reasonCode: TransferBlockedReasonCode;
    reason?: string;
    stage?: SwapLifecycleStage;
    path: string;
    context?: SwapLifecycleContext;
    children: ReactNode;
};

/** Mount only in the branch that actually replaces or disables a transfer action.
 * Unrendered controller models cannot report a block through this boundary. */
export function TransferBlock(props: TransferBlockProps) {
    const callbacks = useOptionalCallbacks();
    // Without a live observer, this boundary only renders its presentation.
    if (!callbacks) {
        return <>{props.children}</>;
    }
    return <ObservedTransferBlock {...props} />;
}

function ObservedTransferBlock({ reasonCode, reason, path, context, stage, children }: TransferBlockProps) {
    const { swapBasicData, swapDetails } = useSwapDataState();
    useTransferBlocked(reasonCode, {
        ...(swapBasicData ? lifecycleContextFromSwap(swapBasicData, swapDetails) : undefined),
        ...context,
    }, path, reason, stage);
    return <>{children}</>;
}

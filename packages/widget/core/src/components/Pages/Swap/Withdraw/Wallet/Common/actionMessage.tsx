import { isUserRejection } from './isUserRejection';
import { useSwapDataState } from '@/context/swap';
import { ErrorHandler } from '@/lib/ErrorHandler';
import { useGaslessPreferenceStore } from '@/stores/gaslessPreferenceStore';
import { ActionMessageType, Network } from '@layerswap/widget-types';
import { FC, type ReactNode, useEffect } from 'react';
import { getActionMessage, ActionMessageView } from '../../Presentation/ActionMessageView';

function useActionMessageProps({ error, adjustAmount, isSignatureError, isLoading, selectedSourceAddress, sourceNetwork, active = true }: {
    active?: boolean;
    error: Error | undefined;
    adjustAmount?: ReactNode;
    isLoading: boolean;
    isSignatureError?: boolean;
    selectedSourceAddress: string;
    sourceNetwork: Network;
}) {
    const gaslessUnavailable = useGaslessPreferenceStore(
        (s) => s.gaslessUnavailable,
    );
    const gaslessErrorMessage = useGaslessPreferenceStore(
        (s) => s.gaslessErrorMessage,
    );
    const { swapError } = useSwapDataState();

    useEffect(() => {
        if (
            active && error && !isUserRejection(error) &&
            (error?.name === ActionMessageType.UnexpectedErrorMessage ||
                !Object.values(ActionMessageType).includes(
                    error.name as ActionMessageType,
                ))
        ) {
            ErrorHandler({
                type: 'SwapWithdrawalError',
                message: error.message,
                name: error.name,
                stack: error.stack,
                cause: error.cause,
            });
        }
    }, [error, active]);

    return {
        error, adjustAmount, isSignatureError, isLoading, selectedSourceAddress, sourceNetwork,
        gaslessUnavailable, gaslessErrorMessage: gaslessErrorMessage ?? undefined,
        swapError: !!swapError,
    };
}
export function useActionMessage(props: Parameters<typeof useActionMessageProps>[0]) {
    return getActionMessage(useActionMessageProps(props));
}
export const ActionMessage: FC<Parameters<typeof useActionMessageProps>[0]> = props => <ActionMessageView {...useActionMessageProps(props)} />;

import { isUserRejection } from './isUserRejection';
import { useSwapDataState } from '@/context/swap';
import { ErrorHandler } from '@/lib/ErrorHandler';
import { useGaslessPreferenceStore } from '@/stores/gaslessPreferenceStore';
import { ActionMessageType, Network } from '@layerswap/widget-types';
import { FC, useEffect } from 'react';
import { ActionMessageView } from '../../Presentation/ActionMessageView';

export const ActionMessage: FC<{
    error: Error | undefined;
    isLoading: boolean;
    isSignatureError?: boolean;
    selectedSourceAddress: string;
    sourceNetwork: Network;
}> = ({ error, isSignatureError, isLoading, selectedSourceAddress, sourceNetwork }) => {
    const gaslessUnavailable = useGaslessPreferenceStore(
        (s) => s.gaslessUnavailable,
    );
    const gaslessErrorMessage = useGaslessPreferenceStore(
        (s) => s.gaslessErrorMessage,
    );
    const { swapError } = useSwapDataState();

    useEffect(() => {
        if (
            error && !isUserRejection(error) &&
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
    }, [error]);

    return (
        <ActionMessageView
            error={error}
            isSignatureError={isSignatureError}
            isLoading={isLoading}
            selectedSourceAddress={selectedSourceAddress}
            sourceNetwork={sourceNetwork}
            gaslessUnavailable={gaslessUnavailable}
            gaslessErrorMessage={gaslessErrorMessage ?? undefined}
            swapError={!!swapError}
        />
    );
};

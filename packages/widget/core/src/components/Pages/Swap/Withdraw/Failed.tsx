import { useDepositSettings } from '@/context/depositSettings';
import { useSwapDataState } from '@/context/swap';
import { ErrorHandler } from '@/lib/ErrorHandler';
import { FC, useCallback, useEffect } from 'react';
import { useIntercom } from 'react-use-intercom';
import { FailedView } from './Presentation/FailedView';

const Failed: FC = () => {
    const { swapDetails } = useSwapDataState();
    const { boot, show, update } = useIntercom();
    const updateWithProps = () =>
        update({ customAttributes: { swapId: swapDetails?.id } });

    useEffect(() => {
        const error = new Error(`Swap failed: ${swapDetails?.id}`);
        ErrorHandler({
            type: 'SwapFailed',
            message: error.message,
            name: error.name,
            stack: error.stack,
            cause: error.cause,
        });
    }, [swapDetails?.id]);

    const startIntercom = useCallback(() => {
        boot();
        show();
        updateWithProps();
    }, [boot, show, updateWithProps]);

    const { isDepositFlow } = useDepositSettings();
    return (
        <FailedView
            status={swapDetails?.status}
            onGetHelp={startIntercom}
            isDepositFlow={isDepositFlow}
        />
    );
};
export default Failed;

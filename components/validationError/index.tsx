import { useValidationContext } from '@/context/validationContext';
import { useSwapDataState } from '@/context/swap';
import React, { useEffect } from 'react';
import { useFormikContext } from 'formik';
import { SwapFormValues } from '@/components/DTOs/SwapFormValues';
import FailIcon from '@/components/icons/FailIcon';
import { ErrorDisplay } from './ErrorDisplay';
import { ErrorDismissButton } from './ErrorDismissButton';

const ValidationError: React.FC<{ showSwapErrors?: boolean }> = ({ showSwapErrors = false }) => {
    const { routeValidation } = useValidationContext();
    const { swapError: _swapError, depositActionsError, setSwapError } = useSwapDataState();
    const { values } = useFormikContext<SwapFormValues>();
    const swapError = showSwapErrors ? _swapError : null

    useEffect(() => {
        if (swapError) setSwapError?.(null);
    }, [showSwapErrors, values.from?.name, values.to?.name, values.fromAsset?.symbol, values.toAsset?.symbol, values.amount, values.fromExchange?.name, values.destination_address]);

    if (routeValidation.message) {
        return (
            <div className="mt-2">
                <ErrorDisplay
                    icon={routeValidation.details.icon}
                    title={routeValidation.details.title}
                    message={routeValidation.message}
                />
            </div>
        );
    }

    if (swapError) {
        return (
            <div className="mt-2">
                <ErrorDisplay
                    icon={<FailIcon width={20} height={20} />}
                    title="Couldn't create swap"
                    message={swapError}
                    action={setSwapError ? <ErrorDismissButton onClick={() => setSwapError(null)} /> : undefined}
                />
            </div>
        );
    }

    if (showSwapErrors && depositActionsError) {
        return (
            <div className="mt-2">
                <ErrorDisplay
                    icon={<FailIcon width={20} height={20} />}
                    title="Couldn't generate deposit address"
                    message={depositActionsError}
                />
            </div>
        );
    }

    return null;
};

export default ValidationError;

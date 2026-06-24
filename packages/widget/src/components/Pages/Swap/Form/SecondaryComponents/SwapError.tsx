import React from 'react';
import { useSwapDataState } from '@/context/swap';
import FailIcon from '@/components/Icons/FailIcon';
import { ErrorDisplay } from './validationError/ErrorDisplay';
import ErrorDismissButton from './validationError/ErrorDismissButton';

/**
 * Surfaces swap-creation errors inline (the widget no longer ships a global
 * `<Toaster>`). Reads `swapError` from the swap context and renders the shared
 * `ErrorDisplay`, mirroring how `ValidationError` wraps it for route issues.
 */
const SwapError: React.FC = () => {
    const { swapError, setSwapError } = useSwapDataState();

    if (!swapError) return null;

    return (
        <ErrorDisplay
            icon={<FailIcon className="h-5 w-5" />}
            title="Couldn't create swap"
            message={swapError}
            action={setSwapError ? <ErrorDismissButton onClick={() => setSwapError("")} /> : undefined}
        />
    );
};

export default SwapError;

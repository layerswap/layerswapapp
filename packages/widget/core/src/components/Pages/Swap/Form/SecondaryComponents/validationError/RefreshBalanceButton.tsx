import React, { useCallback, useEffect, useRef, useState } from 'react';
import { RefreshBalanceButtonView } from '../../../Withdraw/Presentation/BalanceButtonsView';

const MIN_SPIN_DURATION = 1000;

interface RefreshBalanceButtonProps {
    onRefresh: () => void;
    isLoading?: boolean;
}

export const RefreshBalanceButton: React.FC<RefreshBalanceButtonProps> = ({
    onRefresh,
    isLoading,
}) => {
    const [isSpinning, setIsSpinning] = useState(false);
    const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    useEffect(() => {
        return () => clearTimeout(timerRef.current ?? undefined);
    }, []);

    const handleRefresh = useCallback(() => {
        clearTimeout(timerRef.current ?? undefined);
        setIsSpinning(true);
        onRefresh();
        timerRef.current = setTimeout(
            () => setIsSpinning(false),
            MIN_SPIN_DURATION,
        );
    }, [onRefresh]);

    const showSpinner = isSpinning || isLoading;

    return (
        <RefreshBalanceButtonView
            showSpinner={showSpinner}
            onRefresh={handleRefresh}
        />
    );
};

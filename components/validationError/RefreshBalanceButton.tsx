import { RefreshCw } from 'lucide-react';
import React, { useCallback, useEffect, useRef, useState } from 'react';

const MIN_SPIN_DURATION = 1000;

interface RefreshBalanceButtonProps {
    onRefresh: () => void;
    isLoading?: boolean;
}

export const RefreshBalanceButton: React.FC<RefreshBalanceButtonProps> = ({ onRefresh, isLoading }) => {
    const [isSpinning, setIsSpinning] = useState(false);
    const timerRef = useRef<ReturnType<typeof setTimeout>>();

    useEffect(() => {
        return () => clearTimeout(timerRef.current);
    }, []);

    const handleRefresh = useCallback(() => {
        clearTimeout(timerRef.current);
        setIsSpinning(true);
        onRefresh();
        timerRef.current = setTimeout(() => setIsSpinning(false), MIN_SPIN_DURATION);
    }, [onRefresh]);

    const showSpinner = isSpinning || isLoading;

    return (
        <button
            type="button"
            onClick={handleRefresh}
            disabled={showSpinner}
            className="text-primary-text disabled:text-secondary-text bg-secondary-300 hover:bg-secondary-200 flex justify-center items-end gap-2 py-2.5 px-3 rounded-xl mt-3"
        >
            <RefreshCw className={`${showSpinner ? 'animate-spin' : ''} w-4 h-4`} />
            <span className="text-sm font-medium">Refresh</span>
        </button>
    );
};

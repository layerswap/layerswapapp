import { Loader2 } from 'lucide-react';
import React, { useState } from 'react';

interface AdjustAmountButtonProps {
    onEditAmount: () => void;
    isLoading?: boolean;
}

export const AdjustAmountButton: React.FC<AdjustAmountButtonProps> = ({ onEditAmount, isLoading }) => {
    const [editAmountLoading, setEditAmountLoading] = useState(false);

    const handleClick = () => {
        setEditAmountLoading(true);
        onEditAmount();
        setTimeout(() => setEditAmountLoading(false), 1000);
    };

    const disabled = editAmountLoading || isLoading;

    return (
        <button
            type="button"
            onClick={handleClick}
            disabled={disabled}
            className="shrink-0 text-primary-text disabled:text-secondary-text bg-secondary-300 hover:bg-secondary-200 flex items-center gap-1.5 py-1 px-2.5 rounded-lg"
        >
            {disabled && <Loader2 className="w-3 h-3 animate-spin" />}
            <span className="text-xs font-medium">Adjust amount</span>
        </button>
    );
};

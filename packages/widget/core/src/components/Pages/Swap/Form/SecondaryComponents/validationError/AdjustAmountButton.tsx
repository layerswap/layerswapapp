import React, { useState } from 'react';
import { AdjustAmountButtonView } from '../../../Withdraw/Presentation/BalanceButtonsView';

interface AdjustAmountButtonProps {
    onEditAmount: () => void;
    isLoading?: boolean;
    compact?: boolean;
}

export const AdjustAmountButton: React.FC<AdjustAmountButtonProps> = ({
    onEditAmount,
    isLoading,
    compact,
}) => {
    const [editAmountLoading, setEditAmountLoading] = useState(false);

    const handleClick = () => {
        setEditAmountLoading(true);
        onEditAmount();
        setTimeout(() => setEditAmountLoading(false), 1000);
    };

    const disabled = editAmountLoading || isLoading;

    return (
        <AdjustAmountButtonView disabled={disabled} onAdjust={handleClick} compact={compact} />
    );
};

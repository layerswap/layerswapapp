import React, { useState } from 'react';
import { AdjustAmountButtonView } from '../../../Withdraw/Presentation/BalanceButtonsView';

interface AdjustAmountButtonProps {
    onEditAmount: () => void;
    isLoading?: boolean;
}

export const AdjustAmountButton: React.FC<AdjustAmountButtonProps> = ({
    onEditAmount,
    isLoading,
}) => {
    const [editAmountLoading, setEditAmountLoading] = useState(false);

    const handleClick = () => {
        setEditAmountLoading(true);
        onEditAmount();
        setTimeout(() => setEditAmountLoading(false), 1000);
    };

    const disabled = editAmountLoading || isLoading;

    return (
        <AdjustAmountButtonView disabled={disabled} onAdjust={handleClick} />
    );
};

import { FC } from 'react';
import { useDepositStep } from './depositStepContext';
import { DepositHeaderView } from './DepositHeaderView';

const DepositHeader: FC<{
    title?: string;
    onClose?: () => void;
    onBack?: () => void;
}> = ({ title, onClose, onBack }) => {
    const { back, canGoBack, closeLocked } = useDepositStep();
    return (
        <DepositHeaderView
            title={title}
            canGoBack={canGoBack}
            showClose={!!onClose && !closeLocked}
            onBack={onBack ?? back}
            onClose={onClose}
        />
    );
};

export default DepositHeader;

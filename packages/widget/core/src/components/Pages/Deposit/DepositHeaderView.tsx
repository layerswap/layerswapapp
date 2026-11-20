import { FC } from 'react';
import { ChevronLeft, X } from 'lucide-react';
import IconButton from '@/components/Buttons/iconButton';

export type DepositHeaderViewProps = {
    title?: string;
    canGoBack?: boolean;
    showClose?: boolean;
    onBack?: () => void;
    onClose?: () => void;
};

export const DepositHeaderView: FC<DepositHeaderViewProps> = ({
    title = 'Deposit',
    canGoBack,
    showClose,
    onBack,
    onClose,
}) => {
    return (
        <div className="flex items-center justify-between w-full h-[32px]">
            <div className="flex items-center gap-1">
                {canGoBack && (
                    <IconButton
                        onClick={onBack}
                        icon={<ChevronLeft className="h-5 w-5" />}
                        aria-label="Back"
                    />
                )}
                <h2 className="text-primary-text text-lg font-semibold truncate">
                    {title}
                </h2>
            </div>
            {showClose && (
                <IconButton
                    onClick={onClose}
                    icon={<X className="h-5 w-5" />}
                    aria-label="Close"
                />
            )}
        </div>
    );
};

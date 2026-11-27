import InfoIcon from '@/components/Icons/InfoIcon';
import { AdjustAmountButton } from '../../Form/SecondaryComponents/validationError/AdjustAmountButton';
import { ErrorDisplay } from '../../Form/SecondaryComponents/validationError/ErrorDisplay';
import { ICON_CLASSES_WARNING } from '../../Form/SecondaryComponents/validationError/constants';

export type AmountProposalAction = { message: string; onAdjust: () => void };

export function AmountProposalView({ message, onAdjust }: AmountProposalAction) {
    return (
        <ErrorDisplay
            icon={<InfoIcon className={ICON_CLASSES_WARNING} />}
            title="Adjust the amount"
            message={message}
            action={<AdjustAmountButton onEditAmount={onAdjust} />}
        />
    );
}

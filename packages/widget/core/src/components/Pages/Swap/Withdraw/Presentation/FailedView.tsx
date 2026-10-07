import QuestionIcon from '@/components/Icons/Question';
import { SwapStatus } from '@layerswap/widget-types';
export function FailedView({
    status,
    onGetHelp,
    isDepositFlow = false,
}: {
    status: SwapStatus | undefined;
    onGetHelp?: () => void;
    isDepositFlow?: boolean;
}) {
    return (
        <>
            <div>
                <div className="flex items-center gap-2">
                    <span className="relative z-10 flex h-8 w-8 items-center justify-center rounded-full bg-primary/20">
                        <QuestionIcon
                            className="h-7 w-7 text-primary"
                            aria-hidden="true"
                        />
                    </span>
                    <label className="block text-sm md:text-base text-primary-text font-medium">
                        What&apos;s happening?
                    </label>
                </div>
                <div className="mt-4 text-xs md:text-sm text-primary-text">
                    {status == SwapStatus.Expired && (
                        <Expired
                            onGetHelp={onGetHelp}
                            isDepositFlow={isDepositFlow}
                        />
                    )}
                </div>
            </div>
        </>
    );
}
type Props = {
    onGetHelp?: () => void;
    isDepositFlow: boolean;
};

const Expired = ({ onGetHelp, isDepositFlow }: Props) => {
    return (
        <div>
            <span className="text-md text-left text-xs md:text-sm text-primary-text">
                The transfer wasn&apos;t completed during the allocated
                timeframe.
            </span>
            <span className="text-secondary-text">
                <span>{` If you've already sent crypto for this ${isDepositFlow ? 'deposit' : 'swap'}, your funds are safe, `}</span>
                <span
                    className="underline hover:cursor-pointer"
                    onClick={() => onGetHelp?.()}
                >
                    please contact our support.
                </span>
            </span>
        </div>
    );
};

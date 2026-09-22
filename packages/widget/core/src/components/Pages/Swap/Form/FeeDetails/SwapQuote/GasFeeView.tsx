import ToggleButton from '@/components/Buttons/toggleButton';
import {
    Tooltip,
    TooltipContent,
    TooltipTrigger,
} from '@/components/shadcn/tooltip';
import GaslessBadge from '../GaslessBadge';
import { RowWrapper } from '../../../Withdraw/Presentation/QuoteEstimateRows';

export type GasFeePresentation = {
    gasFeeInUsd?: number | null;
    gas?: number;
    gasCurrencyName?: string;
    isGasLoading?: boolean;
    isGaslessCapable?: boolean;
    gaslessEnabled?: boolean;
};

export function GasFeeView({
    gasFeeInUsd,
    gas,
    gasCurrencyName,
    isGasLoading,
    isGaslessCapable,
    gaslessEnabled = false,
    setGaslessEnabled = () => {},
}: GasFeePresentation & { setGaslessEnabled?: (value: boolean) => void }) {
    const isGaslessActive = isGaslessCapable && gaslessEnabled;
    const displayGasFeeInUsd =
        gasFeeInUsd != null
            ? gasFeeInUsd < 0.01
                ? '<$0.01'
                : `$${gasFeeInUsd.toFixed(2)}`
            : null;
    const gaslessToggleHint = gaslessEnabled
        ? 'Turn off to send a standard transaction and pay the network fee yourself.'
        : 'Turn on to skip the network fee — gas is covered for you.';

    if (!isGaslessCapable && !gasFeeInUsd) return null;

    return (
        <RowWrapper title="Gas Fee">
            <div className="flex items-center gap-2">
                {isGasLoading ? (
                    <LoadingBar />
                ) : isGaslessActive ? (
                    <GaslessBadge />
                ) : (
                    <Tooltip>
                        <TooltipTrigger asChild>
                            <div className="flex items-center gap-2 text-sm ml-1 font-small">
                                <span>{displayGasFeeInUsd ?? '-'}</span>
                            </div>
                        </TooltipTrigger>
                        <TooltipContent className="bg-secondary-300! border-secondary-300! text-primary-text! max-w-52">
                            <span>{gas || '-'} </span>
                            <span>{gas ? gasCurrencyName : ''}</span>
                        </TooltipContent>
                    </Tooltip>
                )}
                {isGaslessCapable && (
                    <Tooltip>
                        <TooltipTrigger asChild>
                            <div>
                                <ToggleButton
                                    value={gaslessEnabled}
                                    onChange={setGaslessEnabled}
                                    ariaLabel="Gasless transfer"
                                />
                            </div>
                        </TooltipTrigger>
                        <TooltipContent className="bg-secondary-300! border-secondary-300! text-primary-text! max-w-52">
                            <span>{gaslessToggleHint}</span>
                        </TooltipContent>
                    </Tooltip>
                )}
            </div>
        </RowWrapper>
    );
}

const LoadingBar = () => (
    <div className="h-2.5 w-16 inline-flex bg-gray-500 rounded-xs animate-pulse" />
);

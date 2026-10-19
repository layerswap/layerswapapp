import { Loader2, Pencil, RefreshCw } from 'lucide-react';

const buttonClasses = 'inline-flex shrink-0 items-center justify-center font-medium text-primary-text disabled:text-secondary-text disabled:cursor-not-allowed bg-secondary-300 enabled:hover:bg-secondary-200 transition-colors focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-secondary-text focus-visible:ring-offset-2 focus-visible:ring-offset-secondary-400';
const defaultSizeClasses = 'h-11 gap-2 px-3 rounded-xl text-sm';

export function RefreshBalanceButtonView({
    showSpinner,
    onRefresh,
}: {
    showSpinner?: boolean;
    onRefresh?: () => void;
}) {
    return (
        <button
            type="button"
            onClick={onRefresh}
            disabled={showSpinner}
            className={`${buttonClasses} ${defaultSizeClasses}`}
        >
            <RefreshCw
                aria-hidden="true"
                className={`${showSpinner ? 'animate-spin' : ''} w-4 h-4 shrink-0`}
            />
            <span>Refresh</span>
        </button>
    );
}

export function AdjustAmountButtonView({
    disabled,
    onAdjust,
    compact = false,
}: {
    disabled?: boolean;
    onAdjust?: () => void;
    compact?: boolean;
}) {
    const Icon = disabled ? Loader2 : Pencil;
    return (
        <button
            type="button"
            data-attr="max-amount"
            onClick={onAdjust}
            disabled={disabled}
            className={`${buttonClasses} ${compact ? 'h-7 gap-1.5 px-2.5 rounded-lg text-xs' : defaultSizeClasses}`}
        >
            <Icon aria-hidden="true" className={`${compact ? 'w-3 h-3' : 'w-4 h-4'} shrink-0 ${disabled ? 'animate-spin' : ''}`} />
            <span>Adjust amount</span>
        </button>
    );
}

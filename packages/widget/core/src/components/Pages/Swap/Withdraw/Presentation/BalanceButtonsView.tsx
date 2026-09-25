import { Loader2, RefreshCw } from 'lucide-react';
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
            className="text-primary-text disabled:text-secondary-text bg-secondary-300 hover:bg-secondary-200 flex justify-center items-end gap-2 py-2.5 px-3 rounded-xl mt-3"
        >
            <RefreshCw
                className={`${showSpinner ? 'animate-spin' : ''} w-4 h-4`}
            />
            <span className="text-sm font-medium">Refresh</span>
        </button>
    );
}

export function AdjustAmountButtonView({
    disabled,
    onAdjust,
}: {
    disabled?: boolean;
    onAdjust?: () => void;
}) {
    return (
        <button
            type="button"
            onClick={onAdjust}
            disabled={disabled}
            className="shrink-0 text-primary-text disabled:text-secondary-text bg-secondary-300 hover:bg-secondary-200 flex items-center gap-1.5 py-1 px-2.5 rounded-lg"
        >
            {disabled && <Loader2 className="w-3 h-3 animate-spin" />}
            <span className="text-xs font-medium">Adjust amount</span>
        </button>
    );
}

import { FC, ReactNode } from 'react';
import clsx from 'clsx';
import { ChevronRight, Loader2 } from 'lucide-react';

export type MethodCardProps = {
    icon: ReactNode;
    title: string;
    subtitle: string;
    onClick?: () => void;
    disabled?: boolean;
    disabledReason?: string;
    /** Show a spinner instead of the chevron (and keep the card non-interactive)
     * while the method's availability is still resolving. */
    loading?: boolean;
};

export const MethodCard: FC<MethodCardProps> = ({
    icon,
    title,
    subtitle,
    onClick,
    disabled,
    disabledReason,
    loading,
}) => {
    const nonInteractive = !!disabled || !!loading;
    return (
        <button
            type="button"
            disabled={!loading && !!disabled}
            aria-disabled={nonInteractive}
            aria-busy={loading}
            onClick={() => {
                if (nonInteractive) return;
                onClick?.();
            }}
            title={disabled && !loading ? disabledReason : undefined}
            className={clsx(
                'group/card flex items-start gap-3.5 w-full text-left rounded-2xl px-4 py-3.5 transition-colors',
                'bg-secondary-500 hover:bg-secondary-400/70',
                'border border-transparent hover:border-secondary-300',
                'focus-visible:ring-2 focus-visible:ring-primary-500/60 focus-visible:outline-none',
                nonInteractive &&
                    'opacity-50 hover:bg-secondary-500 hover:border-transparent cursor-not-allowed',
            )}
        >
            <div className="shrink-0 h-[46px] w-[46px] rounded-xl flex items-center justify-center border bg-secondary-700 border-secondary-400">
                {icon}
            </div>
            <div className="flex-1 min-w-0 flex flex-col gap-1">
                <span className="text-primary-text text-base font-semibold truncate">
                    {title}
                </span>
                <span className="text-secondary-text text-[13px] leading-tight truncate">
                    {subtitle}
                </span>
            </div>
            {loading ? (
                <Loader2
                    aria-hidden="true"
                    className="h-5 w-5 text-primary-text-tertiary shrink-0 mt-2.5 animate-spin"
                />
            ) : (
                <ChevronRight
                    aria-hidden="true"
                    className="h-5 w-5 text-primary-text-tertiary shrink-0 mt-2.5"
                />
            )}
        </button>
    );
};

export const MethodPickerView: FC<{
    destinationPicker?: ReactNode;
    children: ReactNode;
}> = ({ destinationPicker, children }) => (
    <div className="flex flex-col gap-2 w-full">
        {destinationPicker}
        <p className="text-secondary-text text-xs px-1 pt-0.5 mb-1">
            Choose how to fund this deposit
        </p>
        <div className="flex flex-col gap-2 w-full">{children}</div>
    </div>
);

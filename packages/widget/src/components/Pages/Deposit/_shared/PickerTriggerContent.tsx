import { FC } from "react";
import { ChevronDown } from "lucide-react";
import clsx from "clsx";
import TokenChainBadge from "./TokenChainBadge";

type PickerTriggerContentProps = {
    /** Eyebrow label above the value, e.g. "You send" / "You receive". */
    label: string;
    /** When provided, the trigger shows the token + network. When omitted,
     * the placeholder is shown instead. */
    token?: { logo?: string; symbol: string };
    network?: { logo?: string; display_name: string };
    placeholder?: string;
    showChevron?: boolean;
    chevronOpen?: boolean;
};

/**
 * Shared inner content for the deposit form's picker trigger buttons.
 * Both PayFromPicker ("You send") and DestinationTokenPicker ("You receive")
 * use this so the closed pickers stay visually identical.
 */
const PickerTriggerContent: FC<PickerTriggerContentProps> = ({
    label,
    token,
    network,
    placeholder = "Select",
    showChevron = true,
    chevronOpen = false,
}) => {
    const hasSelection = !!(token && network);
    return (
        <div className="flex items-center gap-3 w-full text-left">
            {hasSelection ? (
                <TokenChainBadge
                    tokenLogo={token!.logo}
                    tokenSymbol={token!.symbol}
                    networkLogo={network!.logo}
                    networkName={network!.display_name}
                    size={32}
                />
            ) : (
                <span className="h-9 w-9 rounded-full bg-secondary-400 shrink-0" aria-hidden="true" />
            )}
            <span className="flex flex-col grow min-w-0">
                <span className="text-xs text-secondary-text leading-none">
                    <span>{label}</span>
                </span>
                {hasSelection ? (
                    <span className="leading-tight truncate">
                        <span className="text-base font-semibold text-primary-text">{token!.symbol}</span>
                        <span className="ml-1 text-sm font-normal text-secondary-text">on {network!.display_name}</span>
                    </span>
                ) : (
                    <span className="text-sm text-secondary-text leading-tight">
                        <span>{placeholder}</span>
                    </span>
                )}
            </span>
            {showChevron ? (
                <span className="ml-auto flex items-center gap-2 shrink-0">
                    {showChevron && (
                        <ChevronDown
                            className={clsx(
                                "h-4 w-4 text-secondary-text transition-transform",
                                chevronOpen && "rotate-180",
                            )}
                            aria-hidden="true"
                        />
                    )}
                </span>
            ) : null}
        </div>
    );
};

export default PickerTriggerContent;

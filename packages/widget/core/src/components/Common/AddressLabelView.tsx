import { ChevronDown } from 'lucide-react';

/** Shared address text; address-book lookups and popover actions belong to callers. */
export function AddressLabelView({
    label,
    saved = false,
    isForCurrency = false,
    shouldShowChevron = true,
}: {
    label: string;
    saved?: boolean;
    isForCurrency?: boolean;
    shouldShowChevron?: boolean;
}) {
    return (
        <div className="hover:text-secondary-text transition duration-200 flex gap-1 items-center cursor-pointer min-w-0">
            <p
                className={`${isForCurrency ? 'text-xs self-end' : 'text-sm'} block font-medium group-hover/addressItem:underline ${saved ? 'min-w-0 max-w-[260px] truncate' : ''}`}
            >
                {label}
            </p>
            {shouldShowChevron && (
                <ChevronDown className="invisible group-hover/addressItem:visible h-4 w-4 shrink-0" />
            )}
        </div>
    );
}

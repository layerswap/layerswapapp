import { FC, useState } from "react";
import { useRouteSortingStore, SortingOption } from "@/stores/routeSortingStore";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/shadcn/popover";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/shadcn/tooltip";
import InfoIcon from "@/components/icons/InfoIcon";
import clsx from "clsx";
import { ArrowUpDown } from "lucide-react";
import CheckIcon from "@/components/icons/CheckIcon";

const sortingOptions: Array<{
    value: SortingOption;
    label: string;
    showInfo?: boolean;
    infoText?: string;
}> = [
        {
            value: SortingOption.RELEVANCE,
            label: 'Relevance',
            showInfo: true,
            infoText: 'Sorted by balance for "from" direction, by usage history and rank for "to" direction'
        },
        {
            value: SortingOption.MOST_USED,
            label: 'Most Used'
        },
        {
            value: SortingOption.TRENDING,
            label: 'Trending'
        },
        {
            value: SortingOption.ALPHABETICAL_ASC,
            label: 'Alphabetical A-Z'
        },
        {
            value: SortingOption.ALPHABETICAL_DESC,
            label: 'Alphabetical Z-A'
        }
    ];

const RouteSortingMenu: FC = () => {
    const [open, setOpen] = useState(false);
    const sortingOption = useRouteSortingStore((s) => s.sortingOption);
    const setSortingOption = useRouteSortingStore((s) => s.setSortingOption);

    const handleSelect = (option: SortingOption) => {
        setSortingOption(option);
        setOpen(false);
    };

    return (
        <Popover open={open} onOpenChange={setOpen}>
            <PopoverTrigger asChild>
                <button
                    type="button"
                    className="flex items-center justify-center rounded-lg p-1 hover:bg-secondary-400 transition-colors"
                    aria-label="Sort options"
                >
                    <ArrowUpDown className="w-4 h-4 text-primary-text-tertiary hover:text-primary-text transition-colors" />
                </button>
            </PopoverTrigger>
            <PopoverContent className="min-w-[170px] p-0 bg-secondary-500! rounded-xl" align="start" sideOffset={8}>
                <div className=" flex flex-col gap-1">
                    {sortingOptions.map((option) => (
                        <button
                            key={option.value}
                            type="button"
                            onClick={() => handleSelect(option.value)}
                            className={clsx(
                                "w-full px-1.5 py-0.5 text-sm text-left flex items-center justify-between hover:bg-secondary-300 transition-colors rounded-lg",
                                {
                                    "bg-secondary-300": sortingOption === option.value
                                }
                            )}
                        >
                            <span className="flex items-center gap-2">
                                <span className={clsx("text-secondary-text font-normal", {
                                    "text-primary-text": sortingOption === option.value
                                })}>
                                    {option.label}
                                </span>
                                {option.showInfo && (
                                    <Tooltip>
                                        <TooltipTrigger
                                            type="button"
                                            onClick={(e) => {
                                                e.stopPropagation();
                                            }}
                                            className="flex items-center"
                                        >
                                            <span>
                                                <InfoIcon className="w-3.5 h-3.5 text-primary-text-tertiary hover:text-primary-text transition-colors" />
                                            </span>
                                        </TooltipTrigger>
                                        <TooltipContent side="right" className="max-w-[240px] text-xs">
                                            <p>{option.infoText}</p>
                                        </TooltipContent>
                                    </Tooltip>
                                )}
                            </span>
                            {sortingOption === option.value && (
                                <CheckIcon className="w-4 h-4 text-primary-text shrink-0" />
                            )}
                        </button>
                    ))}
                </div>
            </PopoverContent>
        </Popover>
    );
};

export default RouteSortingMenu;


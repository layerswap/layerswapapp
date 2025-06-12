import * as React from "react";
import { Popover, PopoverContent, PopoverTrigger } from "./popover";
import { CheckIcon, ChevronDownIcon } from "lucide-react";
import { cn } from "@/lib/utils";

type MultiSelectOption = {
    label: string;
    value: string;
    icon?: string;
};

interface MultiSelectProps {
    options: MultiSelectOption[];
    value: string[];
    onChange: (val: string[]) => void;
    placeholder?: string;
    onPopoverClose?: () => void;
}

export function MultiSelect({
    options,
    value,
    onChange,
    placeholder = "Select options",
    onPopoverClose,
}: MultiSelectProps) {
    const [open, setOpen] = React.useState(false);
    const wasOpen = React.useRef(false);

    React.useEffect(() => {
        if (wasOpen.current && !open && onPopoverClose) {
            onPopoverClose();
        }
        wasOpen.current = open;
    }, [open, onPopoverClose]);

    const toggleOption = (val: string) => {
        if (value.includes(val)) {
            onChange(value.filter((v) => v !== val));
        } else {
            onChange([...value, val]);
        }
    };

    const selectedLabels = options
        .filter((o) => value.includes(o.value))
        .map((o) => o.label)
        .join(", ");

    return (
        <Popover open={open} onOpenChange={setOpen} >
            <PopoverTrigger className="tw-flex tw-w-full tw-items-center tw-justify-between tw-truncate !tw-rounded-xl tw-bg-secondary-700 tw-text-base tw-text-primary-text placeholder:tw-text-secondary-text">
                <p
                    className={cn(
                        "tw-text-left tw-overflow-hidden tw-rounded-xl",
                        !selectedLabels && " tw-text-secondary-text"
                    )}
                    title={selectedLabels}
                >
                    {selectedLabels || placeholder}
                </p>
                <ChevronDownIcon className="tw-ml-2 tw-h-4 tw-w-4 tw-opacity-50 tw-shrink-0" />
            </PopoverTrigger>
            <PopoverContent
                className="tw-z-50 tw-mt-2 tw-max-h-[300px] !tw-max-w-[400px] tw-overflow-y-auto tw-w-full tw-rounded-md tw-bg-secondary-700 tw-p-2 tw-text-secondary-text tw-shadow-md tw-ring-1 tw-ring-secondary-500 styled-scroll"
                align="start"
            >
                <div className="tw-space-y-1 tw-overflow-y-auto">
                    {options.map((opt) => {
                        const selected = value.includes(opt.value);
                        return (
                            <button
                                key={opt.value}
                                type="button"
                                onClick={() => toggleOption(opt.value)}
                                className={cn(
                                    "tw-flex tw-w-full tw-items-center tw-justify-between tw-rounded-md tw-border tw-px-3 tw-py-2 tw-text-sm tw-transition-colors",
                                    "tw-border-secondary-500 tw-bg-secondary-600 tw-text-secondary-text",
                                    selected && "tw-border-primary tw-text-primary-text"
                                )}
                            >
                                <div className="tw-flex tw-items-center tw-gap-2">
                                    {opt.icon && (
                                        <img
                                            src={opt.icon}
                                            alt="icon"
                                            className="tw-h-5 tw-w-5 tw-rounded-sm"
                                        />
                                    )}
                                    <span>{opt.label}</span>
                                </div>
                                {selected && <CheckIcon className="tw-h-4 tw-w-4 tw-text-primary" />}
                            </button>
                        );
                    })}
                </div>
            </PopoverContent>
        </Popover>
    );
}


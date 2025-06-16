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
            <PopoverTrigger className="flex w-full items-center justify-between truncate !rounded-xl bg-secondary-700 text-base text-primary-text placeholder:text-secondary-text">
                <p
                    className={cn(
                        "text-left overflow-hidden rounded-xl",
                        !selectedLabels && " text-secondary-text"
                    )}
                    title={selectedLabels}
                >
                    {selectedLabels || placeholder}
                </p>
                <ChevronDownIcon className="ml-2 h-4 w-4 opacity-50 shrink-0" />
            </PopoverTrigger>
            <PopoverContent
                className="z-50 mt-2 max-h-[300px] !max-w-[400px] overflow-y-auto w-full rounded-md bg-secondary-700 p-2 text-secondary-text shadow-md ring-1 ring-secondary-500 styled-scroll"
                align="start"
            >
                <div className="space-y-1 overflow-y-auto">
                    {options.map((opt) => {
                        const selected = value.includes(opt.value);
                        return (
                            <button
                                key={opt.value}
                                type="button"
                                onClick={() => toggleOption(opt.value)}
                                className={cn(
                                    "flex w-full items-center justify-between rounded-md border px-3 py-2 text-sm transition-colors hover:bg-secondary-500 duration-200 border-secondary-400 bg-secondary-600 text-secondary-text",
                                    selected && "border-primary text-primary-text"
                                )}
                            >
                                <div className="flex items-center gap-2">
                                    {opt.icon && (
                                        <img
                                            src={opt.icon}
                                            alt="icon"
                                            className="h-5 w-5 rounded-sm"
                                        />
                                    )}
                                    <span>{opt.label}</span>
                                </div>
                                {selected && <CheckIcon className="h-4 w-4 text-primary" />}
                            </button>
                        );
                    })}
                </div>
            </PopoverContent>
        </Popover>
    );
}


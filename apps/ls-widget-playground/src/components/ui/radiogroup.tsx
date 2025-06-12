"use client"
import * as React from "react";
import { CheckIcon } from "lucide-react";
import { cn } from "@/lib/utils";

type RadioGroupContextType = {
    value: string;
    onChange: (val: string) => void;
};

const RadioGroupContext = React.createContext<RadioGroupContextType | null>(null);

export interface RadioGroupProps extends Omit<React.HTMLAttributes<HTMLDivElement>, "onChange"> {
    value: string;
    onChange: (val: string) => void;
}

function RadioGroup({ value, onChange, className, ...props }: RadioGroupProps) {
    return (
        <RadioGroupContext.Provider value={{ value, onChange }}>
            <div className={cn("tw-space-y-1", className)} {...props} />
        </RadioGroupContext.Provider>
    );
}

interface RadioGroupItemProps extends React.HTMLAttributes<HTMLButtonElement> {
    value: string;
    children: React.ReactNode;
    asChild?: boolean;
}

function RadioGroupItem({ value, children, className, ...props }: RadioGroupItemProps) {
    const context = React.useContext(RadioGroupContext);
    if (!context) throw new Error("RadioGroup.Item must be used within RadioGroup");

    const isChecked = context.value === value;

    return (
        <button
            type="button"
            onClick={() => context.onChange(value)}
            className={cn(
                "tw-relative tw-flex tw-w-full tw-cursor-pointer tw-justify-start tw-items-center tw-rounded-md tw-border tw-p-3 tw-text-base tw-transition-colors tw-bg-transparent tw-bg-secondary-700",
                "tw-text-secondary-text tw-border-secondary-500",
                isChecked && "tw-bg-secondary-700 tw-text-primary-text tw-border-primary  tw-justify-between",
                className
            )}
            {...props}
        >
            {children}
            {isChecked && <CheckIcon className="tw-h-4 tw-w-4 tw-text-primary tw-shrink-0" />}
        </button>
    );
}

interface RadioGroupContentProps extends React.HTMLAttributes<HTMLDivElement> { }

function RadioGroupContent({ className, ...props }: RadioGroupContentProps) {
    return (
        <div
            className={cn("tw-rounded-md border tw-border-secondary-500 tw-bg-secondary-700 p-2", className)}
            {...props}
        />
    );
}

export const CustomRadioGroup = Object.assign(RadioGroup, {
    Item: RadioGroupItem,
    Content: RadioGroupContent,
});

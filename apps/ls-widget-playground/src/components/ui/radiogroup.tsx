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
            <div className={cn("space-y-1 px-2", className)} {...props} />
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
                "relative flex w-full cursor-pointer justify-start items-center rounded-md border py-3 px-2 text-base bg-transparent bg-secondary-700 hover:border-primary transition-colors duration-200",
                "text-secondary-text border-secondary-500",
                isChecked && "bg-secondary-700 text-primary-text justify-between",
                className
            )}
            {...props}
        >
            {children}
            {isChecked && <CheckIcon className="h-4 w-4 text-primary shrink-0" />}
        </button>
    );
}

interface RadioGroupContentProps extends React.HTMLAttributes<HTMLDivElement> { }

function RadioGroupContent({ className, ...props }: RadioGroupContentProps) {
    return (
        <div
            className={cn("rounded-md border border-secondary-500 bg-secondary-700 p-2", className)}
            {...props}
        />
    );
}

export const CustomRadioGroup = Object.assign(RadioGroup, {
    Item: RadioGroupItem,
    Content: RadioGroupContent,
});

"use client";
import { useWidgetContext } from "@/context/ConfigContext";
import { Input } from "@/components/ui/input"
import { useEffect, useState } from "react";

export function ActionTextButton() {
    const { actionText, updateActionText } = useWidgetContext();
    const [value, setValue] = useState(actionText);

    useEffect(() => {
        if (actionText === "Next") {
            setValue("");
        }
    }, [actionText]);

    useEffect(() => {
        const timeout = setTimeout(() => {
            updateActionText(value);
        }, 500)

        return () => clearTimeout(timeout);
    }, [value]);

    return (
        <div className="my-1 rounded-xl py-3 px-2 bg-secondary-600  flex items-center justify-between gap-1 h-12 hover:bg-secondary-500 transition-colors duration-200 ">
            <Input
                value={value}
                onChange={(e) => setValue(e.target.value)}
                placeholder="e. g. Next"
            />
        </div>
    );
}

export const ActionTextButtonTrigger = () => {
    const { actionText } = useWidgetContext();

    return (
        <div className="flex justify-between w-full">
            <label>
                Action button text
            </label>
            <div className="flex items-center space-x-1.5 text-secondary-text">
                <p>{actionText || 'Next'}</p>
            </div>
        </div>
    );
}

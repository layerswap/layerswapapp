"use client";
import * as React from "react"
import { useWidgetContext } from "@/context/ConfigContext";
import { ThemeData } from '@layerswap/widget';
import { Select, SelectContent, SelectGroup, SelectItem, SelectTrigger, SelectValue, } from "@/components/ui/select"

export function CardRadiusButton() {
    const { updateTheme, themeData } = useWidgetContext();

    const handleClick = (radius: string) => {
        updateTheme('borderRadius', radius as ThemeData['borderRadius']);
    };

    return (
        <div className="w-full flex gap-2 alling-items-center justify-center">
            <Select value={themeData?.borderRadius} onValueChange={handleClick}>
                <SelectTrigger className="flex gap-2 w-full border-none bg-secondary-600 hover:bg-secondary-500 transition-colors duration-200">
                    <SelectValue />
                </SelectTrigger>
                <SelectContent>
                    <SelectGroup>
                        {borderRadiusValues.map(({ value, label }) => (
                            <SelectItem key={value} value={value as string}>
                                {label}
                            </SelectItem>
                        ))}
                    </SelectGroup>
                </SelectContent>
            </Select>
        </div>
    );
}

export const CardRadiusButtonTrigger = () => {
    const { themeData } = useWidgetContext();
    return (
        <div className="flex justify-between w-full">
            <label>
                Border radius
            </label>
            <label className="capitalize text-secondary-text">
                {themeData?.borderRadius}
            </label>
        </div>
    );
}

const borderRadiusValues: { value: ThemeData['borderRadius']; label: string }[] = [
    { value: 'none', label: 'None' },
    { value: 'small', label: 'Small' },
    { value: 'medium', label: 'Medium' },
    { value: 'large', label: 'Large' },
    { value: 'extraLarge', label: 'Extra large' },
    { value: 'default', label: 'Default' },
];
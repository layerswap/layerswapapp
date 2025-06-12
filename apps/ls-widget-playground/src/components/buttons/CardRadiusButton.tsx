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
        <div className="tw-w-full tw-flex tw-gap-2 tw-alling-items-center tw-justify-center">
            <Select value={themeData?.borderRadius} onValueChange={handleClick}>
                <SelectTrigger className="tw-flex tw-gap-2 tw-w-full tw-border-none tw-bg-secondary-600">
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
        <div className="tw-flex tw-justify-between tw-w-full">
            <label>
                Border radius
            </label>
            <label className="tw-capitalize">
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
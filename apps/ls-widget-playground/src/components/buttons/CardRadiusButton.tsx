"use client";
import * as React from "react"
import { useTheme } from "@/context/ThemeContext";
import { ThemeData } from '@layerswap/widget';
import {
    Select,
    SelectContent,
    SelectGroup,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select"

export function CardRadiusButton() {
    const { updateTheme, themeData } = useTheme();

    const handleClick = (radius: string) => {
        updateTheme('borderRadius', radius as ThemeData['borderRadius']);
    };

    return (
        <div className="w-full flex gap-2 alling-items-center justify-center">
            <Select value={themeData?.borderRadius} onValueChange={handleClick}>
                <SelectTrigger className="w-full">
                    <SelectValue placeholder="Border radius" />
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

const borderRadiusValues: { value: ThemeData['borderRadius']; label: string }[] = [
    { value: 'none', label: 'None' },
    { value: 'small', label: 'Small' },
    { value: 'medium', label: 'Medium' },
    { value: 'large', label: 'Large' },
    { value: 'extraLarge', label: 'Extra large' },
    { value: 'default', label: 'Default' },
];
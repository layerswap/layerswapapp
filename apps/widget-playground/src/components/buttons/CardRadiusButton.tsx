"use client";
import * as React from "react"
import { useWidgetContext } from "@/context/ConfigContext";
import { ThemeData } from '@layerswap/widget';
import { Check } from "lucide-react";

export function CardRadiusButton() {
    const { updateTheme, themeData } = useWidgetContext();

    const handleClick = (radius: ThemeData['borderRadius']) => {
        updateTheme('borderRadius', radius);
    };

    return (
        <div className="flex flex-col gap-3 pb-1">
            {borderRadiusValues.map(({ value, label }) => {
                const isSelected = themeData?.borderRadius === value;
                return (
                    <div
                        key={value}
                        onClick={() => handleClick(value)}
                        className={`flex items-center justify-between cursor-pointer rounded-md py-3 px-2 transition-colors duration-200 ${isSelected ? 'bg-secondary-300' : 'hover:bg-secondary-500'
                            }`}
                    >
                        <span className="text-xl text-primary-text leading-6">{label}</span>
                        {isSelected && <Check className="w-5 h-5 text-primary-text" />}
                    </div>
                );
            })}
        </div>
    );
}

export const CardRadiusButtonTrigger = () => {
    const { themeData } = useWidgetContext();
    const currentRadius = borderRadiusValues.find((item) => item.value === themeData?.borderRadius);

    return (
        <div className="flex justify-between w-full">
            <label>
                Border radius
            </label>
            <label className="text-secondary-text">
                {currentRadius?.label || themeData?.borderRadius}
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
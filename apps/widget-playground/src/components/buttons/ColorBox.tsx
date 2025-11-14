"use client";
import tinycolor from "tinycolor2";
import { useWidgetContext } from "@/context/ConfigContext";
import { ThemeData } from "@layerswap/widget";
import { Popover, PopoverContent, PopoverTrigger, } from "@/components/ui/popover";
import { useState, useEffect, useCallback } from "react";
import {
    ColorPicker,
    ColorPickerSelection,
    ColorPickerHue,
    ColorPickerAlpha,
    ColorPickerFormat,
    ColorPickerOutput
} from "@/components/ui/shadcn-io/color-picker";

type ColorBoxProps = {
    rgbColor: string;
    colorKey: string
};

export function ColorBox({ rgbColor, colorKey }: ColorBoxProps) {
    const { updateTheme, themeData } = useWidgetContext();
    const cssColor = `rgb(${rgbColor})`;
    const hexColor = tinycolor(cssColor).toHexString();
    const [inputValue, setInputValue] = useState(hexColor);

    // Sync input value when rgbColor prop changes
    useEffect(() => {
        setInputValue(hexColor);
    }, [hexColor]);

    const updateThemeColor = useCallback((rgbString: string) => {
        if (!themeData) return;

        const nestedColorGroups = ['primary', 'secondary', 'warning', 'error', 'success'];
        const matchedGroup = nestedColorGroups.find(group => colorKey.startsWith(group));
        if (matchedGroup) {
            const subKey = colorKey.replace(matchedGroup, '').trim() || 'DEFAULT';
            const currentGroup = themeData[matchedGroup as keyof ThemeData];
            if (typeof currentGroup === 'object' && currentGroup !== null) {
                const updatedGroup = {
                    ...currentGroup,
                    [subKey]: rgbString,
                };
                updateTheme(matchedGroup as keyof ThemeData, updatedGroup as any);
            }
        } else {
            updateTheme(colorKey as keyof ThemeData, rgbString);
        }
    }, [colorKey, themeData, updateTheme]);

    const handleColorChange = useCallback((value: any) => {
        // The ColorPicker passes [r, g, b, alpha] array
        if (Array.isArray(value)) {
            const [r, g, b] = value;
            const rgbString = `${Math.round(r)}, ${Math.round(g)}, ${Math.round(b)}`;
            updateThemeColor(rgbString);
        }
    }, [updateThemeColor]);

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const hex = e.target.value;
        setInputValue(hex);

        // Validate and update if it's a valid hex color
        if (/^#[0-9A-Fa-f]{6}$/.test(hex)) {
            const color = tinycolor(hex);
            if (color.isValid()) {
                const { r, g, b } = color.toRgb();
                const rgbString = `${r}, ${g}, ${b}`;
                updateThemeColor(rgbString);
            }
        }
    };

    const handleInputBlur = () => {
        // Reset to actual color if invalid
        const color = tinycolor(inputValue);
        if (!color.isValid() || !/^#[0-9A-Fa-f]{6}$/.test(inputValue)) {
            setInputValue(hexColor);
        }
    };

    return (
        <div className="flex items-center gap-2">
            <input
                type="text"
                value={inputValue}
                onChange={handleInputChange}
                onBlur={handleInputBlur}
                className="w-[100px] h-8 rounded-lg border border-secondary-300 px-2 text-base bg-transparent text-secondary-text focus:outline-none focus:ring-0 focus:border-secondary-300"
            />
            <Popover>
                <PopoverTrigger asChild>
                    <button className="w-8 h-8 rounded-lg border border-secondary-300 p-1 flex items-center justify-center cursor-pointer">
                        <div
                            className="w-6 h-6 rounded"
                            style={{ backgroundColor: hexColor }}
                        />
                    </button>
                </PopoverTrigger>
                <PopoverContent className="w-auto">
                    <ColorPicker
                        value={hexColor}
                        onChange={handleColorChange}
                    >
                        <ColorPickerSelection className="h-[150px]" />
                        <div className="flex gap-2 mt-2">
                            <ColorPickerHue />
                        </div>
                        <div className="flex gap-2 mt-2">
                            <ColorPickerAlpha />
                        </div>
                        <div className="flex gap-2 mt-2">
                            <ColorPickerFormat />
                            <ColorPickerOutput />
                        </div>
                    </ColorPicker>
                </PopoverContent>
            </Popover>
        </div>
    );
}

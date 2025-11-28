"use client";
import { useWidgetContext } from "@/context/ConfigContext";
import { THEME_COLORS, THEME_OPTIONS } from "@/lib/Themes";
import { Check, Plus } from "lucide-react";
import tinycolor from "tinycolor2";

type ThemeKey = typeof THEME_OPTIONS[number]["value"];
export function ThemeButton() {
    const { updateWholeTheme, themeName, themeData } = useWidgetContext();

    const handleClick = (value: ThemeKey) => {
        const newTheme = THEME_COLORS[value];
        if (newTheme) {
            // Preserve existing customizations (header and hidePoweredBy)
            updateWholeTheme({
                theme: {
                    ...newTheme,
                    header: themeData?.header,
                    hidePoweredBy: themeData?.hidePoweredBy,
                },
                themeName: value
            });
        }
    };

    return (
        <div className="flex flex-col gap-3 pb-1">
            {THEME_OPTIONS.map(({ value, label }) => {
                const isSelected = themeName === value;
                const theme = THEME_COLORS[value];
                const previewColors = [
                    theme?.primary?.[500],
                    theme?.secondary?.[500],
                    theme?.primary?.text,
                ];

                return (
                    <div
                        key={value}
                        onClick={() => handleClick(value as ThemeKey)}
                        className={`flex items-center justify-between cursor-pointer rounded-md py-3 px-2 transition-colors ${isSelected ? 'bg-secondary-300' : 'hover:bg-secondary-500'
                            }`}
                    >
                        <span className="text-xl leading-6 text-primary-text">{label}</span>
                        {isSelected ? (
                            <Check className="w-5 h-5 text-primary-text" />
                        ) : (
                            <div className="flex gap-1">
                                {previewColors.map((color, index) => (
                                    <div
                                        key={index}
                                        style={{ backgroundColor: tinycolor(`rgb(${color})`).toRgbString() }}
                                        className="w-6 h-6 rounded-md"
                                    />
                                ))}
                                <div className="w-6 h-6 flex rounded-md items-center bg-secondary-500 justify-center">
                                    <Plus className="w-5 h-5 text-secondary-text" />
                                </div>
                            </div>
                        )}
                    </div>
                );
            })}
        </div>
    );
}

export const ThemeButtonTrigger = () => {
    const { themeName } = useWidgetContext();
    const currentTheme = THEME_OPTIONS.find((item) => item.value === themeName);

    return (
        <div className="flex justify-between w-full">
            <label>
                Base theme
            </label>
            <label className="text-secondary-text">
                {currentTheme?.label || themeName}
            </label>
        </div>
    );
}
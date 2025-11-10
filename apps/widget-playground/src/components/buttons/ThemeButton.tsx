"use client";
import { useWidgetContext } from "@/context/ConfigContext";
import { Select, SelectContent, SelectGroup, SelectItem, SelectTrigger, SelectValue, } from "@/components/ui/select"
import { THEME_COLORS, THEME_OPTIONS } from "@/lib/Themes";
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
        <div className="w-full flex gap-2 alling-items-center justify-center">
            <Select value={themeName} onValueChange={handleClick}>
                <SelectTrigger className="flex gap-2 w-full border-none bg-secondary-600 hover:bg-secondary-500 transition-colors duration-200">
                    <SelectValue />
                </SelectTrigger>
                <SelectContent className="max-h-[300px]">
                    <SelectGroup>
                        {THEME_OPTIONS.map(({ value, label }) => (
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

export const ThemeButtonTrigger = () => {
    const { themeName } = useWidgetContext();
    return (
        <div className="flex justify-between w-full">
            <label>
                Base theme
            </label>
            <label className="capitalize text-secondary-text">
                {themeName}
            </label>
        </div>
    );
}
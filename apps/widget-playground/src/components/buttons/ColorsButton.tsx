"use client";
import { useWidgetContext } from "@/context/ConfigContext";
import { THEME_COLORS } from "@layerswap/widget";
import { useMemo } from "react";
import { ColorBox } from "./ColorBox";
import tinycolor from "tinycolor2";
import { Plus } from "lucide-react";

const getColors = (theme?: typeof THEME_COLORS['default']) => {
    if (!theme?.primary || !theme?.secondary) return undefined

    const additionalColors = [
        { displayName: 'Tertiary', value: theme.tertiary, id: 'tertiary' },
        { displayName: 'Button text color', value: theme.buttonTextColor, id: 'buttonTextColor' },
    ];

    const statusColors = [
        { displayName: 'Warning foreground', value: theme.warning?.Foreground, id: 'warningForeground' },
        { displayName: 'Warning background', value: theme.warning?.Background, id: 'warningBackground' },
        { displayName: 'Error foreground', value: theme.error?.Foreground, id: 'errorForeground' },
        { displayName: 'Error background', value: theme.error?.Background, id: 'errorBackground' },
        { displayName: 'Success foreground', value: theme.success?.Foreground, id: 'successForeground' },
        { displayName: 'Success background', value: theme.success?.Background, id: 'successBackground' },
    ];

    const primaryColors = [
        { displayName: 'Primary default', value: theme.primary.DEFAULT, id: 'primary' },
        { displayName: 'Primary 100', value: theme.primary[100], id: 'primary100' },
        { displayName: 'Primary 200', value: theme.primary[200], id: 'primary200' },
        { displayName: 'Primary 300', value: theme.primary[300], id: 'primary300' },
        { displayName: 'Primary 400', value: theme.primary[400], id: 'primary400' },
        { displayName: 'Primary 500', value: theme.primary[500], id: 'primary500' },
        { displayName: 'Primary 600', value: theme.primary[600], id: 'primary600' },
        { displayName: 'Primary 700', value: theme.primary[700], id: 'primary700' },
        { displayName: 'Primary 800', value: theme.primary[800], id: 'primary800' },
        { displayName: 'Primary 900', value: theme.primary[900], id: 'primary900' },
        { displayName: 'Primary text', value: theme.primary.text, id: 'primarytext' },
    ];

    const secondaryColors = [
        { displayName: 'Secondary default', value: theme.secondary.DEFAULT, id: 'secondary' },
        { displayName: 'Secondary 100', value: theme.secondary[100], id: 'secondary100' },
        { displayName: 'Secondary 200', value: theme.secondary[200], id: 'secondary200' },
        { displayName: 'Secondary 300', value: theme.secondary[300], id: 'secondary300' },
        { displayName: 'Secondary 400', value: theme.secondary[400], id: 'secondary400' },
        { displayName: 'Secondary 500', value: theme.secondary[500], id: 'secondary500' },
        { displayName: 'Secondary 600', value: theme.secondary[600], id: 'secondary600' },
        { displayName: 'Secondary 700', value: theme.secondary[700], id: 'secondary700' },
        { displayName: 'Secondary 800', value: theme.secondary[800], id: 'secondary800' },
        { displayName: 'Secondary 900', value: theme.secondary[900], id: 'secondary900' },
        { displayName: 'Secondary text', value: theme.secondary.text, id: 'secondarytext' },
    ];

    return [...additionalColors, ...statusColors, ...primaryColors, ...secondaryColors];
}

export function ColorsContent() {
    const { themeData } = useWidgetContext();
    const editColors = useMemo(() => getColors(themeData), [themeData]);
    return <div className="flex flex-col gap-1 py-1">
        {editColors?.map(({ displayName, value, id }) => (
            <div key={id} className="flex items-center justify-between gap-4 py-1 px-2 hover:bg-secondary-500 rounded-md">
                <span className="text-xl leading-6">{displayName}</span>
                <ColorBox rgbColor={value!} colorKey={id} />
            </div>
        ))}
    </div>
}

export const ColorsTrigger = () => {
    const { themeData } = useWidgetContext();

    const previewColors = [
        themeData?.primary?.[500],
        themeData?.secondary?.[500],
        themeData?.primary?.text,
    ];

    return (
        <div className="flex justify-between w-full">
            <label>
                Colors
            </label>
            <div className="flex justify-end gap-1">
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
        </div>
    )
}
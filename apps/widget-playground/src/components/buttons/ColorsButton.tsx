"use client";
import { useWidgetContext } from "@/context/ConfigContext";
import { THEME_COLORS } from "@layerswap/widget";
import { useMemo } from "react";
import { ColorBox } from "./ColorBox";
import tinycolor from "tinycolor2";

const getColors = (theme?: typeof THEME_COLORS['default']) => {
    if (!theme?.primary || !theme?.secondary) return undefined

    const additionalColors = [
        { displayName: 'Tertiary', value: theme.tertiary, id: 'tertiary' },
        { displayName: 'Button text color', value: theme.buttonTextColor, id: 'buttonTextColor' },
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

    return [...additionalColors, ...primaryColors, ...secondaryColors];
}

export function ColorsContent() {
    const { themeData } = useWidgetContext();
    const editColors = useMemo(() => getColors(themeData), [themeData]);
    return editColors?.map(({ displayName, value, id }) => (
        <div key={id} className="my-1 rounded-xl p-2 bg-secondary-600  hover:bg-secondary-500 transition-colors duration-200 flex items-center justify-between gap-4">
            <span>{displayName}</span>
            <ColorBox rgbColor={value!} colorKey={id} />
        </div>
    ))
}

export const ColorsTrigger = () => {
    const { themeData } = useWidgetContext();
    const editColors = useMemo(() => getColors(themeData), [themeData]);

    return (
        <div className="flex justify-between w-full">
            <label>
                Colors
            </label>
            <div className="flex justify-end ">
                {editColors?.map(({ value, id }) => (
                    <div key={id}
                        style={{ backgroundColor: tinycolor(`rgb(${value})`).toRgbString() }}
                        className="w-2.5 h-full"
                    ></div>
                ))}
            </div>
        </div>
    )
}
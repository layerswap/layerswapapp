"use client";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger, } from "@/components/ui/accordion"
import { useTheme } from "@/context/ThemeContext";
import { ThemeData, THEME_COLORS } from "@layerswap/widget";
import { useState } from "react";
import { ColorBox } from "./ColorBox";

const getColors = (theme?: typeof THEME_COLORS['default']) => {
    if (!theme?.primary || !theme?.secondary) return undefined

    return {
        primary: theme.primary.DEFAULT,
        primary50: theme.primary['50'],
        primary100: theme.primary['100'],
        primary200: theme.primary['200'],
        primary300: theme.primary['300'],
        primary400: theme.primary['400'],
        primary500: theme.primary['500'],
        primary600: theme.primary['600'],
        primary700: theme.primary['700'],
        primary800: theme.primary['800'],
        primary900: theme.primary['900'],
        primaryText: theme.primary.text,
        primaryTextMuted: theme.primary.textMuted,

        secondary50: theme.secondary['50'],
        secondary100: theme.secondary['100'],
        secondary200: theme.secondary['200'],
        secondary300: theme.secondary['300'],
        secondary400: theme.secondary['400'],
        secondary500: theme.secondary['500'],
        secondary600: theme.secondary['600'],
        secondary700: theme.secondary['700'],
        secondary800: theme.secondary['800'],
        secondary900: theme.secondary['900'],
        secondary950: theme.secondary['950'],
        secondaryText: theme.secondary.text,
    }
}

export function ColorsButton() {
    const { updateTheme, themeData } = useTheme();
    const editColors = getColors(themeData);


    return (
        <Accordion type="multiple" >
            <AccordionItem value="colors">
                <AccordionTrigger>Colors</AccordionTrigger>
                <AccordionContent>

                    {editColors && Object.entries(editColors).map(([key, val]) => (
                        <div key={key} className="my-1 rounded-xl p-2 bg-secondary-600 capitalize flex items-center justify-between gap-4">
                            <span>{key}</span>
                            <ColorBox rgbColor={val!} />
                        </div>
                    ))}
                </AccordionContent>

            </AccordionItem>
        </Accordion>
    );
}


/*
"default": {
        backdrop: "62, 18, 64",
        placeholderText: '140, 152, 192',
        actionButtonText: '254, 255, 254',
        buttonTextColor: '228, 229, 240',
        logo: '255, 0, 147',
        borderRadius: 'small',
        primary: {
            DEFAULT: '228, 37, 117',
            '50': '248, 200, 220',
            '100': '246, 182, 209',
            '200': '241, 146, 186',
            '300': '237, 110, 163',
            '400': '232, 73, 140',
            '500': '228, 37, 117',
            '600': '166, 51, 94',
            '700': '136, 17, 67',
            '800': '147, 8, 99',
            '900': '110, 0, 64',
            'text': '254, 255, 254',
            'textMuted': '86, 97, 123',
        },
        secondary: {
            DEFAULT: '17, 29, 54',
            '50': '49, 60, 155',
            '100': '46, 59, 147',
            '200': '35, 42, 112',
            '300': '32, 41, 101',
            '400': '28, 39, 89',
            '500': '22, 37, 70',
            '600': '20, 33, 62',
            '700': '17, 29, 54',
            '800': '15, 25, 47',
            '900': '12, 21, 39',
            '950': '11, 17, 35',
            'text': '171, 181, 209',
        },
    }
*/
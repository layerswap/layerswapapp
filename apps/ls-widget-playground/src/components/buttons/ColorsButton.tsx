"use client";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger, } from "@/components/ui/accordion"
import { useTheme } from "@/context/ThemeContext";
import { THEME_COLORS } from "@layerswap/widget";
import { useMemo } from "react";
import { ColorBox } from "./ColorBox";

const getColors = (theme?: typeof THEME_COLORS['default']) => {
    if (!theme?.primary || !theme?.secondary) return undefined

    return [
        { displayName: 'Primary default', value: theme.primary.DEFAULT, id: 'primary' },
        { displayName: 'Primary 50', value: theme.primary[50], id: 'primary50' },
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
        { displayName: 'Primary text muted', value: theme.primary.textMuted, id: 'primarytextMuted' },
        { displayName: 'Secondary default', value: theme.secondary.DEFAULT, id: 'secondary' },
        { displayName: 'Secondary 50', value: theme.secondary[50], id: 'secondary50' },
        { displayName: 'Secondary 100', value: theme.secondary[100], id: 'secondary100' },
        { displayName: 'Secondary 200', value: theme.secondary[200], id: 'secondary200' },
        { displayName: 'Secondary 300', value: theme.secondary[300], id: 'secondary300' },
        { displayName: 'Secondary 400', value: theme.secondary[400], id: 'secondary400' },
        { displayName: 'Secondary 500', value: theme.secondary[500], id: 'secondary500' },
        { displayName: 'Secondary 600', value: theme.secondary[600], id: 'secondary600' },
        { displayName: 'Secondary 700', value: theme.secondary[700], id: 'secondary700' },
        { displayName: 'Secondary 800', value: theme.secondary[800], id: 'secondary800' },
        { displayName: 'Secondary 900', value: theme.secondary[900], id: 'secondary900' },
        { displayName: 'Secondary 950', value: theme.secondary[950], id: 'secondary950' },
        { displayName: 'Secondary text', value: theme.secondary.text, id: 'secondarytext' }
    ]
}

export function ColorsButton() {
    const { themeData } = useTheme();
    const editColors = useMemo(() => getColors(themeData), [themeData]);

    return (
        <Accordion type="multiple" >
            <AccordionItem value="colors">
                <AccordionTrigger>Colors</AccordionTrigger>
                <AccordionContent>

                    {editColors?.map(({ displayName, value, id }) => (
                        <div key={id} className="my-1 rounded-xl p-2 bg-secondary-600  flex items-center justify-between gap-4">
                            <span>{displayName}</span>
                            <ColorBox rgbColor={value!} colorKey={id} />
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
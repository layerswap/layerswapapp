"use client";
import tinycolor from "tinycolor2";
import Sketch from "@uiw/react-color-sketch";
import { } from "@uiw/react-color-swatch"
import { useTheme } from "@/context/ConfigContext";
import { ThemeData } from "@layerswap/widget";
import { Popover, PopoverContent, PopoverTrigger, } from "@/components/ui/popover"

type ColorPickerProps = {
    rgbColor: string; //rgb
    colorKey: string
};

function isDarkColor(rgb: string): boolean {
    const [r, g, b] = rgb.split(',').map(Number);
    const brightness = (r * 299 + g * 587 + b * 114) / 1000;
    return brightness < 128;
}


interface RgbColor {
    r: number;
    g: number;
    b: number;
}

export function ColorBox({ rgbColor, colorKey }: ColorPickerProps) {
    const { updateTheme, themeData } = useTheme();
    const cssColor = `rgb(${rgbColor})`;
    const hexColor = tinycolor(cssColor).toHexString();
    const textColor = isDarkColor(rgbColor) ? 'white' : 'black';

    const handleColorChange = ({ b, g, r }: RgbColor) => {
        const updatedTheme = { ...themeData };
        const group = colorKey.startsWith("primary") ? "primary" : "secondary";
        const rawKey = colorKey.replace(group, "").trim() || "DEFAULT";
        const rgbString = `${r}, ${g}, ${b}`;
        if (!themeData) return;
        const currentGroup = themeData[group];
        const updatedGroup = {
            ...currentGroup,
            [rawKey]: rgbString,
        };

        updateTheme(group as keyof ThemeData, updatedGroup as any)
    }

    return (
        <div className=" relative inline-block">
            <Popover>
                <PopoverTrigger asChild>
                    <div
                        className="w-24 h-10 rounded-lg flex items-center justify-center text-sm cursor-pointer "
                        style={{ backgroundColor: hexColor, color: textColor }}
                    >
                        {hexColor}
                    </div>
                </PopoverTrigger>
                <PopoverContent>
                    <Sketch
                        className="!bg-transparent !border-0 !outline-none !shadow-none"
                        color={hexColor}
                        onChange={(col) => { handleColorChange(col.rgb) }}
                    />
                    <button>
                        apply
                    </button>
                </PopoverContent>
            </Popover>
        </div>
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
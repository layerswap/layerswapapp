"use client";
import tinycolor from "tinycolor2";
import Sketch from "@uiw/react-color-sketch";
import { } from "@uiw/react-color-swatch"
import { useWidgetContext } from "@/context/ConfigContext";
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
    const { updateTheme, themeData } = useWidgetContext();
    const cssColor = `rgb(${rgbColor})`;
    const hexColor = tinycolor(cssColor).toHexString();
    const textColor = isDarkColor(rgbColor) ? 'white' : 'black';

    const handleColorChange = ({ b, g, r }: RgbColor) => {
        const rgbString = `${r}, ${g}, ${b}`;

        if (!themeData) return;

        if (colorKey.startsWith('primary') || colorKey.startsWith('secondary')) {
            const group = colorKey.startsWith('primary') ? 'primary' : 'secondary';
            const rawKey = colorKey.replace(group, "").trim() || "DEFAULT";
            const currentGroup = themeData[group];
            const updatedGroup = {
                ...currentGroup,
                [rawKey]: rgbString,
            };

            updateTheme(group as keyof ThemeData, updatedGroup as any);
        } else {
            updateTheme(colorKey as keyof ThemeData, rgbString);
        }
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

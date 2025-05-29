"use client";
import { useState } from "react";
import tinycolor from "tinycolor2";
import Sketch from "@uiw/react-color-sketch";

type ColorPickerProps = {
    rgbColor: string; //rgb
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

export function ColorBox({ rgbColor }: ColorPickerProps) {
    const [isPickerOpen, setIsPickerOpen] = useState(false);
    const [color, setColor] = useState(rgbColor);

    const cssColor = `rgb(${color})`;
    const hexColor = tinycolor(cssColor).toHexString();
    const textColor = isDarkColor(rgbColor) ? 'white' : 'black';

    const handleColorChange = ({ b, g, r }: RgbColor) => {
        setColor(`${r} ${g} ${b}`);
    }

    return (
        <div className=" relative inline-block">
            <div
                className="w-24 h-10 rounded-lg flex items-center justify-center text-sm cursor-pointer "
                style={{ backgroundColor: hexColor, color: textColor }}
                onClick={() => setIsPickerOpen(!isPickerOpen)}
            >
                {hexColor}
            </div>
            {isPickerOpen && (
                <div className="absolute z-50 right-0">
                    <Sketch
                        className="bg-secondary-500 border border-secondary-400"
                        color={hexColor}
                        onChange={(col) => { handleColorChange(col.rgb) }}
                    />
                </div>
            )}
        </div>
    );
}
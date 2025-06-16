"use client";
import { useWidgetContext } from "@/context/ConfigContext";
import { ThemeData } from '@layerswap/widget';
import { Select, SelectContent, SelectGroup, SelectItem, SelectTrigger, SelectValue, } from "@/components/ui/select"

const THEME_OPTIONS: { value: string, label: string }[] = [
    { value: "default", label: "Default" },
    { value: "light", label: "Light" },
    { value: "beige", label: "Warm beige" },
    { value: "black", label: "Black and white" },
    { value: "terminal", label: "Terminal" },
    { value: "cyberpunk", label: "Cyberpunk" },
    { value: "void", label: "Void Walker" },
]
type ThemeKey = typeof THEME_OPTIONS[number]["value"];
export function ThemeButton() {
    const { updateWholeTheme, themeName } = useWidgetContext();

    const handleClick = (value: ThemeKey) => {
        const newTheme = THEME_COLORS[value];
        if (newTheme) {
            updateWholeTheme({ theme: newTheme, themeName: value });
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
const THEME_COLORS: { [key: string]: ThemeData } = {
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
    },
    "light": {
        placeholderText: '134, 134, 134',
        actionButtonText: '255, 255, 255',
        buttonTextColor: '17, 17, 17',
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
            '900': '196, 153, 175',
            'text': '17, 17, 17',
            'textMuted': '86, 97, 123',
        },
        secondary: {
            DEFAULT: '240, 240, 240',
            '50': '49, 60, 155',
            '100': '46, 59, 147',
            '200': '134, 134, 134',
            '300': '139, 139, 139',
            '400': '177, 177, 177',
            '500': '218, 218, 218',
            '600': '223, 223, 223',
            '700': '240, 240, 240',
            '800': '243, 244, 246',
            '900': '250, 248, 248',
            '950': '255, 255, 255',
            'text': '108, 108, 108',
        },
    },

    "beige": {
        backdrop: "255, 248, 240",
        placeholderText: "120, 100, 80",
        actionButtonText: "60, 50, 40",
        buttonTextColor: "60, 50, 40",
        logo: "230, 200, 170",
        borderRadius: "small",
        primary: {
            DEFAULT: "230, 200, 170",
            '50': "255, 248, 240",
            '100': "250, 235, 210",
            '200': "245, 225, 190",
            '300': "240, 215, 180",
            '400': "235, 205, 175",
            '500': "230, 200, 170",
            '600': "200, 175, 150",
            '700': "180, 160, 140",
            '800': "160, 145, 130",
            '900': "140, 130, 120",
            text: "60, 50, 40",
            textMuted: "120, 100, 80",
        },
        secondary: {
            DEFAULT: "255, 248, 240",
            '50': "255, 255, 255",
            '100': "250, 245, 235",
            '200': "240, 235, 225",
            '300': "230, 225, 215",
            '400': "220, 215, 205",
            '500': "210, 205, 195",
            '600': "200, 195, 185",
            '700': "190, 185, 175",
            '800': "180, 175, 165",
            '900': "170, 165, 155",
            '950': "160, 155, 145",
            text: "80, 60, 40",
        },
    },

    "black": {
        backdrop: "0, 0, 0",
        placeholderText: '128, 128, 128',
        actionButtonText: '0, 0, 0',
        buttonTextColor: '255, 255, 255',
        logo: '255, 255, 255',
        borderRadius: 'small',
        primary: {
            DEFAULT: '255, 255, 255',
            '50': '245, 245, 245',
            '100': '224, 224, 224',
            '200': '192, 192, 192',
            '300': '160, 160, 160',
            '400': '128, 128, 128',
            '500': '96, 96, 96',
            '600': '64, 64, 64',
            '700': '32, 32, 32',
            '800': '16, 16, 16',
            '900': '0, 0, 0',
            'text': '255, 255, 255',
            'textMuted': '160, 160, 160',
        },
        secondary: {
            DEFAULT: '32, 32, 32',
            '50': '245, 245, 245',
            '100': '224, 224, 224',
            '200': '192, 192, 192',
            '300': '160, 160, 160',
            '400': '128, 128, 128',
            '500': '96, 96, 96',
            '600': '64, 64, 64',
            '700': '48, 48, 48',
            '800': '32, 32, 32',
            '900': '16, 16, 16',
            '950': '0, 0, 0',
            'text': '200, 200, 200',
        },
    },

    "terminal": {
        backdrop: "0, 0, 0",
        placeholderText: '255, 255, 255',
        actionButtonText: '0, 0, 0',
        buttonTextColor: '255, 255, 255',
        logo: '0, 255, 0',
        borderRadius: 'small',
        primary: {
            DEFAULT: '0, 255, 0',
            '50': '204, 255, 204',
            '100': '153, 255, 153',
            '200': '102, 204, 102',
            '300': '51, 153, 51',
            '400': '0, 128, 0',
            '500': '0, 110, 0',
            '600': '0, 90, 0',
            '700': '0, 70, 0',
            '800': '0, 50, 0',
            '900': '0, 30, 0',
            text: '255, 255, 255',
            textMuted: '255, 180, 255',
        },
        secondary: {
            DEFAULT: '0, 0, 0',
            '50': '30, 30, 30',
            '100': '26, 26, 26',
            '200': '22, 22, 22',
            '300': '18, 18, 18',
            '400': '14, 14, 14',
            '500': '10, 40, 10',
            '600': '8, 32, 8',
            '700': '6, 60, 6',
            '800': '4, 20, 4',
            '900': '2, 10, 2',
            '950': '0, 0, 0',
            text: '255, 255, 255',
        },
    },

    "cyberpunk": {
        backdrop: "10, 0, 20",
        placeholderText: "255, 120, 230",
        actionButtonText: "0, 255, 180",
        buttonTextColor: "0, 255, 180",
        logo: "255, 45, 200",
        borderRadius: "small",
        primary: {
            DEFAULT: "255, 45, 200",
            '50': "255, 235, 245",
            '100': "255, 210, 240",
            '200': "255, 170, 230",
            '300': "255, 130, 220",
            '400': "255, 90, 210",
            '500': "255, 45, 200",
            '600': "220, 35, 170",
            '700': "180, 25, 140",
            '800': "140, 15, 110",
            '900': "100, 10, 80",
            text: "0, 255, 180",
            textMuted: "180, 120, 180",
        },
        secondary: {
            DEFAULT: "22, 10, 40",
            '50': "80, 60, 100",
            '100': "70, 50, 90",
            '200': "60, 40, 80",
            '300': "50, 30, 70",
            '400': "40, 24, 60",
            '500': "32, 18, 50",
            '600': "26, 14, 40",
            '700': "20, 10, 30",
            '800': "14, 6, 24",
            '900': "10, 4, 18",
            '950': "6, 2, 12",
            text: "0, 255, 180",
        },
    },

    "void": {
        backdrop: "5, 5, 10",
        placeholderText: "150, 150, 200",
        actionButtonText: "0, 200, 255",
        buttonTextColor: "0, 255, 255",
        logo: "80, 0, 255",
        borderRadius: "small",
        primary: {
            DEFAULT: "80, 0, 255",
            '50': "220, 210, 255",
            '100': "180, 160, 255",
            '200': "140, 120, 255",
            '300': "110, 90, 255",
            '400': "90, 60, 255",
            '500': "80, 0, 255",
            '600': "65, 0, 200",
            '700': "50, 0, 160",
            '800': "35, 0, 120",
            '900': "20, 0, 80",
            text: "0, 255, 255",
            textMuted: "130, 130, 200",
        },
        secondary: {
            DEFAULT: "10, 10, 20",
            '50': "40, 40, 60",
            '100': "35, 35, 55",
            '200': "30, 30, 50",
            '300': "25, 25, 45",
            '400': "20, 20, 40",
            '500': "15, 15, 35",
            '600': "12, 12, 30",
            '700': "10, 10, 25",
            '800': "8, 8, 20",
            '900': "6, 6, 15",
            '950': "4, 4, 10",
            text: "200, 255, 255",
        },
    },
}
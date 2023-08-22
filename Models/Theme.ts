
export type ThemeData = {
    backdrop: string,
    actionButtonText: string,
    logo: string,
    placeholderText: string,
    primary: {
        logoColor: string,
    } & ThemeColor,
    secondary: ThemeColor
}

export type ThemeColor = {
    DEFAULT: string;
    50: string;
    100: string;
    200: string;
    300: string;
    400: string;
    500: string;
    600: string;
    700: string;
    800: string;
    900: string;
    text: string,
}

export const DEFAULT_THEMES = {
    "imxMarketplace": {
        backdrop: "#007985",
        actionButtonText: '#000000',
        logo: '#ffffffff',
        primary: {
            DEFAULT: '#2EECFF',
            '50': '#E6FDFF',
            '100': '#D1FBFF',
            '200': '#A8F7FF',
            '300': '#80F3FF',
            '400': '#57F0FF',
            '500': '#2EECFF',
            '600': '#00E8FF',
            '700': '#00ACBD',
            '800': '#007985',
            '900': '#00464D',
            'text': '#fff',
        },
        secondary: {
            DEFAULT: '#111D36',
            '50': '#313C9B',
            '100': '#2E3B93',
            '200': '#232A70',
            '300': '#202965',
            '400': '#1C2759',
            '500': '#162546',
            '600': '#14213E',
            '700': '#111D36',
            '800': '#0F192F',
            '900': '#0C1527',
            '950': '#0B1123',
            'text': '#D1FBFF',
        },
    },
    "ea7df14a1597407f9f755f05e25bab42": {
        backdrop: "#007985",
        placeholderText: '#C6F2F6',
        actionButtonText: '#000000',
        logo: '#ffffffff',
        primary: {
            DEFAULT: '#80E2EB',
            '50': '#FFFFFF',
            '100': '#FFFFFF',
            '200': '#EAFAFC',
            '300': '#C6F2F6',
            '400': '#A3EAF1',
            '500': '#80E2EB',
            '600': '#50D7E3',
            '700': '#22C9D9',
            '800': '#1A9CA8',
            '900': '#136F78',
            '950': '#0F5960',
            'text': '#fff',
        },
        secondary: {
            DEFAULT: '#2E5970',
            '50': '#C1D9E6',
            '100': '#B3D0E0',
            '200': '#96BFD4',
            '300': '#79ADC8',
            '400': '#5C9BBC',
            '500': '#224253',
            '600': '#0F1D27',
            '700': '#0F1D27',
            '800': '#224253',
            '900': '#162B36',
            '950': '#0E1B22',
            'text': '#D1FBFF',
        },
    },
    "light": {
        placeholderText: '#000',
        actionButtonText: '255 255 255',
        logo: '#e23173',
        primary: {
            DEFAULT: '#E42575',
            '50': '#F8C8DC',
            '100': '#F6B6D1',
            '200': '#F192BA',
            '300': '#ED6EA3',
            '400': '#E8498C',
            '500': '#E42575',
            '600': '#A6335E',
            '700': '#881143',
            '800': '#930863',
            '900': '#c499af',
            'background': '#F6B6D1',
            'text': '#111111',
            'text-muted': '#56617B',
            'logoColor': '#FF0093'
        },
        secondary: {
            DEFAULT: '#EFEFEF',
            '50': '#313C9B',
            '100': '#2E3B93',
            '200': '#868686',
            '300': '#8b8b8b',
            '400': '#b1b1b1',
            '500': '#cfcfcf',
            '600': '#dfdfdf',
            '700': '#f0f0f0',
            '800': '#f3f4f6',
            '900': '#faf8f8',
            '950': '#fff',
            'text': '#6c6c6c',
        },
    }
}
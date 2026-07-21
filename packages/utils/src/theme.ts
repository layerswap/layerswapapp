import type { Properties } from "csstype";

export type ThemeData = {
    buttonTextColor?: string,
    logo?: string,
    tertiary?: string,
    primary?: ThemeColor,
    secondary?: ThemeColor,
    warning?: StatusColor,
    error?: StatusColor,
    success?: StatusColor,
    borderRadius?: 'none' | 'small' | 'medium' | 'large' | 'extraLarge' | 'default',
    enablePortal?: boolean,
    enableWideVersion?: boolean,
    header?: {
        hideMenu?: boolean,
        hideTabs?: boolean,
        hideWallets?: boolean,
    }
    cardBackgroundStyle?: Properties<string | number>
    hidePoweredBy?: boolean
}

export type ThemeColor = {
    DEFAULT: string;
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

export type StatusColor = {
    Foreground: string;
    Background: string;
}

// `csstype` is the types-only package `React.CSSProperties` itself is built
// on (zero runtime), so this stays framework-agnostic while remaining
// assignable to a React `style` prop.
import type { Properties as CSSProperties } from "csstype";

/**
 * Visual theme for the widget. This is the canonical definition — the widget
 * package (`@layerswap/widget`) re-exports it, and the loader packages consume
 * it through this contract, so there is a single source of truth.
 */
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
    cardBackgroundStyle?: CSSProperties<string | number>
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

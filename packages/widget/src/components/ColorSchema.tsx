import { FC } from "react";
import { THEME_COLORS, ThemeData } from "../Models/Theme";

type Props = {
    themeData?: ThemeData | null
}

const BORDER_RADIUS_VALUES = {
    small: 4,
    medium: 6,
    large: 8,
    extraLarge: 12,
    extraLarge2: 16,
    extraLarge3: 24
};

const mergeWithFallback = (themeData: ThemeData | null | undefined, fallbackTheme: ThemeData): ThemeData => {
    if (!themeData) return fallbackTheme;

    const deepMerge = (target: any, source: any): any => {
        if (source === null || source === undefined) return target;
        if (target === null || target === undefined) return source;

        if (typeof source === 'object' && typeof target === 'object') {
            const result = { ...target };
            for (const key in source) {
                result[key] = source[key] !== undefined ? deepMerge(target[key], source[key]) : target[key];
            }
            return result;
        }

        return source !== undefined ? source : target;
    };

    return deepMerge(fallbackTheme, themeData);
};

export const adjustBorderRadius = (key: string, borderRadiusType: string | undefined) => {
    if (borderRadiusType === 'none') return '0';

    const values = {
        small: { small: 2, medium: 4, large: 6, extraLarge: 8, extraLarge2: 12, extraLarge3: 16 },
        medium: { small: 4, medium: 6, large: 8, extraLarge: 12, extraLarge2: 16, extraLarge3: 24 },
        large: { small: 6, medium: 8, large: 12, extraLarge: 16, extraLarge2: 24, extraLarge3: 24 },
        extraLarge: { small: 8, medium: 12, large: 16, extraLarge: 24, extraLarge2: 24, extraLarge3: 24 },
    };

    const selected = values[borderRadiusType as keyof typeof values];
    if (!selected) {
        return `${BORDER_RADIUS_VALUES[key]}px`;
    }

    return `${selected[key]}px`;
};


const ColorSchema: FC<Props> = ({ themeData }) => {
    const fallbackTheme = THEME_COLORS.default;
    const mergedTheme = mergeWithFallback(themeData, fallbackTheme);

    return (
        <>
            <style>{`
                :root {
                    --ls-border-radius-none: 0px;
                    --ls-border-radius-sm: ${adjustBorderRadius('small', mergedTheme.borderRadius)};
                    --ls-border-radius-md: ${adjustBorderRadius('medium', mergedTheme.borderRadius)};
                    --ls-border-radius-lg: ${adjustBorderRadius('large', mergedTheme.borderRadius)};
                    --ls-border-radius-xl: ${adjustBorderRadius('extraLarge', mergedTheme.borderRadius)};
                    --ls-border-radius-2xl: ${adjustBorderRadius("extraLarge2", mergedTheme.borderRadius)};
                    --ls-border-radius-3xl: ${adjustBorderRadius("extraLarge3", mergedTheme.borderRadius)};
                    --ls-border-radius-full: 9999px;
                    --ls-border-radius-default: ${adjustBorderRadius('small', mergedTheme.borderRadius)};

                    --ls-colors-backdrop: ${mergedTheme.backdrop};
                    --ls-colors-logo: ${mergedTheme.logo};
                    --ls-colors-primary: ${mergedTheme.primary?.DEFAULT};
                    --ls-colors-primary-100: ${mergedTheme.primary?.[100]};
                    --ls-colors-primary-200: ${mergedTheme.primary?.[200]};
                    --ls-colors-primary-300: ${mergedTheme.primary?.[300]};
                    --ls-colors-primary-400: ${mergedTheme.primary?.[400]};
                    --ls-colors-primary-500: ${mergedTheme.primary?.[500]};
                    --ls-colors-primary-600: ${mergedTheme.primary?.[600]};
                    --ls-colors-primary-700: ${mergedTheme.primary?.[700]};
                    --ls-colors-primary-800: ${mergedTheme.primary?.[800]};
                    --ls-colors-primary-900: ${mergedTheme.primary?.[900]};

                    --ls-colors-buttonTextColor: ${mergedTheme.buttonTextColor};
                    --ls-colors-text-tertiary: ${mergedTheme.tertiary};
                    --ls-colors-primary-text: ${mergedTheme.primary?.text};

                    --ls-colors-secondary: ${mergedTheme.secondary?.DEFAULT};
                    --ls-colors-secondary-100: ${mergedTheme.secondary?.[100]};
                    --ls-colors-secondary-200: ${mergedTheme.secondary?.[200]};
                    --ls-colors-secondary-300: ${mergedTheme.secondary?.[300]};
                    --ls-colors-secondary-400: ${mergedTheme.secondary?.[400]};
                    --ls-colors-secondary-500: ${mergedTheme.secondary?.[500]};
                    --ls-colors-secondary-600: ${mergedTheme.secondary?.[600]};
                    --ls-colors-secondary-700: ${mergedTheme.secondary?.[700]};
                    --ls-colors-secondary-800: ${mergedTheme.secondary?.[800]};
                    --ls-colors-secondary-900: ${mergedTheme.secondary?.[900]};
                    --ls-colors-secondary-text: ${mergedTheme.secondary?.text};

                    --ls-color-warning-foreground: ${mergedTheme.warning?.Foreground};
                    --ls-colors-warning-background: ${mergedTheme.warning?.Background};
                    --ls-color-error-foreground: ${mergedTheme.error?.Foreground};
                    --ls-colors-error-background: ${mergedTheme.error?.Background};
                    --ls-color-success-foreground: ${mergedTheme.success?.Foreground};
                    --ls-colors-success-background: ${mergedTheme.success?.Background};
                }
                .headerLogo {
                    display: ${mergedTheme.headerLogo};
                }
                .footerLogo {
                    display: ${mergedTheme.footerLogo};
                    height: ${mergedTheme.footerLogoHeight};
                }
            `}
            </style>
        </>
    )
}
export default ColorSchema
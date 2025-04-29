import { FC } from "react";
import { THEME_COLORS, ThemeData } from "../Models/Theme";

type Props = {
    themeData?: ThemeData | null
}

const BORDER_RADIUS_VALUES = {
    sm: 8,
    md: 20,
    lg: 56,
};

const adjustBorderRadius = (key: string, borderRadiusType: string | undefined) => {
    if (borderRadiusType === 'none') return '0';
    if (borderRadiusType === 'full') return '9999px';

    const values = {
        sm: { sm: 4, md: 6, lg: 8 },
        md: { sm: 6, md: 8, lg: 12 },
        lg: { sm: 10, md: 12, lg: 16 },
    };

    const selected = values[borderRadiusType as keyof typeof values];

    if (!selected) {
        return `${BORDER_RADIUS_VALUES[key]}px`;
    }

    return `${selected[key]}px`;
};

const ColorSchema: FC<Props> = ({ themeData }) => {
    const fallbackTheme = THEME_COLORS.default

    const backdrop = themeData?.backdrop || fallbackTheme.backdrop;
    const logo = themeData?.logo || fallbackTheme.logo;
    const actionButtonText = themeData?.actionButtonText || fallbackTheme.actionButtonText;
    const buttonTextColor = themeData?.buttonTextColor || fallbackTheme.buttonTextColor;
    const placeholderText = themeData?.placeholderText || fallbackTheme.placeholderText;
    const headerLogo = themeData?.headerLogo || fallbackTheme.headerLogo;
    const footerLogo = themeData?.footerLogo || fallbackTheme.footerLogo;
    const footerLogoHeight = themeData?.footerLogoHeight || fallbackTheme.footerLogoHeight;
    const borderRadius = themeData?.borderRadius || fallbackTheme.borderRadius;
    
    const primary = themeData?.primary || fallbackTheme.primary;
    const secondary = themeData?.secondary || fallbackTheme.secondary;

    return (
        <>
            <style>{`
                :root {
                    --ls-border-radius-none: 0px;
                    --ls-border-radius-sm: ${adjustBorderRadius('sm', borderRadius)};
                    --ls-border-radius-md: ${adjustBorderRadius('md', borderRadius)};
                    --ls-border-radius-lg: ${adjustBorderRadius('lg', borderRadius)};
                    --ls-border-radius-default: ${adjustBorderRadius('sm', borderRadius)};
                    --ls-border-radius-full: 9999px;

                    --ls-colors-backdrop: ${backdrop};
                    --ls-colors-logo: ${logo};
                    
                    --ls-colors-primary: ${primary?.DEFAULT};
                    --ls-colors-primary-50: ${primary?.[50]};
                    --ls-colors-primary-100: ${primary?.[100]};
                    --ls-colors-primary-200: ${primary?.[200]};
                    --ls-colors-primary-300: ${primary?.[300]};
                    --ls-colors-primary-400: ${primary?.[400]};
                    --ls-colors-primary-500: ${primary?.[500]};
                    --ls-colors-primary-600: ${primary?.[600]};
                    --ls-colors-primary-700: ${primary?.[700]};
                    --ls-colors-primary-800: ${primary?.[800]};
                    --ls-colors-primary-900: ${primary?.[900]};

                    --ls-colors-actionButtonText: ${actionButtonText};
                    --ls-colors-buttonTextColor: ${buttonTextColor};
                    --ls-colors-text-placeholder: ${placeholderText};
                    --ls-colors-primary-text: ${primary?.text};
                    --ls-colors-primary-text-muted: ${primary?.textMuted};
                    --ls-colors-primary-logoColor: ${logo};

                    --ls-colors-secondary: ${secondary?.DEFAULT};
                    --ls-colors-secondary-50: ${secondary?.[50]};
                    --ls-colors-secondary-100: ${secondary?.[100]};
                    --ls-colors-secondary-200: ${secondary?.[200]};
                    --ls-colors-secondary-300: ${secondary?.[300]};
                    --ls-colors-secondary-400: ${secondary?.[400]};
                    --ls-colors-secondary-500: ${secondary?.[500]};
                    --ls-colors-secondary-600: ${secondary?.[600]};
                    --ls-colors-secondary-700: ${secondary?.[700]};
                    --ls-colors-secondary-800: ${secondary?.[800]};
                    --ls-colors-secondary-900: ${secondary?.[900]};
                    --ls-colors-secondary-950: ${secondary?.[950]};
                    --ls-colors-secondary-text: ${secondary?.text};
                }

                .headerLogo {
                    display: ${headerLogo};
                }
                .footerLogo {
                    display: ${footerLogo};
                    height: ${footerLogoHeight};
                }
            `}</style>
        </>
    )
}
export default ColorSchema
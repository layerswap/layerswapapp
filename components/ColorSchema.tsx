import { FC, useState, useEffect } from "react";
import { THEME_COLORS, ThemeData } from "../Models/Theme";

type Props = {
    themeData?: ThemeData | null
}
const ColorSchema: FC<Props> = ({ themeData }) => {
    const [clientThemeData, setClientThemeData] = useState<ThemeData | null>(themeData || THEME_COLORS.default);

    useEffect(() => {
        const clientDate = new Date();
        const halloweenEndDate = new Date('2025-10-31');
        halloweenEndDate.setHours(23, 59, 59, 999);
        if (clientDate <= halloweenEndDate && !themeData) {
            setClientThemeData(THEME_COLORS.halloween);
        }
    }, [themeData]);

    const resolvedThemeData = clientThemeData || THEME_COLORS.default

    return (
        <>
            {resolvedThemeData &&
                <style global jsx>{`
                    :root {
                        --ls-colors-backdrop:${resolvedThemeData.backdrop};
                        --ls-colors-logo: ${resolvedThemeData.logo};
                        --ls-colors-primary: ${resolvedThemeData.primary?.DEFAULT};
                        --ls-colors-primary-100: ${resolvedThemeData.primary?.[100]};
                        --ls-colors-primary-200: ${resolvedThemeData.primary?.[200]};
                        --ls-colors-primary-300: ${resolvedThemeData.primary?.[300]};
                        --ls-colors-primary-400: ${resolvedThemeData.primary?.[400]};
                        --ls-colors-primary-500: ${resolvedThemeData.primary?.[500]};
                        --ls-colors-primary-600: ${resolvedThemeData.primary?.[600]};
                        --ls-colors-primary-700: ${resolvedThemeData.primary?.[700]};
                        --ls-colors-primary-800: ${resolvedThemeData.primary?.[800]};
                        --ls-colors-primary-900: ${resolvedThemeData.primary?.[900]};

                        --ls-colors-buttonTextColor: ${resolvedThemeData.buttonTextColor};
                        --ls-colors-text-tertiary: ${resolvedThemeData.tertiary};
                        --ls-colors-primary-text: ${resolvedThemeData.primary?.text};

                        --ls-colors-secondary: ${resolvedThemeData.secondary?.DEFAULT};
                        --ls-colors-secondary-100: ${resolvedThemeData.secondary?.[100]};
                        --ls-colors-secondary-200: ${resolvedThemeData.secondary?.[200]};
                        --ls-colors-secondary-300: ${resolvedThemeData.secondary?.[300]};
                        --ls-colors-secondary-400: ${resolvedThemeData.secondary?.[400]};
                        --ls-colors-secondary-500: ${resolvedThemeData.secondary?.[500]};
                        --ls-colors-secondary-600: ${resolvedThemeData.secondary?.[600]};
                        --ls-colors-secondary-700: ${resolvedThemeData.secondary?.[700]};
                        --ls-colors-secondary-800: ${resolvedThemeData.secondary?.[800]};
                        --ls-colors-secondary-900: ${resolvedThemeData.secondary?.[900]};
                        --ls-colors-secondary-text: ${resolvedThemeData.secondary?.text};

                        --ls-color-warning-foreground: ${resolvedThemeData.warning?.Foreground}
                        --ls-colors-warning-background: ${resolvedThemeData.warning?.Background}
                        --ls-color-error-foreground: ${resolvedThemeData.error?.Foreground}
                        --ls-colors-error-background: ${resolvedThemeData.error?.Background}
                        --ls-color-success-foreground: ${resolvedThemeData.success?.Foreground}
                        --ls-colors-success-background: ${resolvedThemeData.success?.Background}
                    }
                    .headerLogo {
                        display: ${resolvedThemeData.headerLogo};
                    }
                    .footerLogo {
                        display: ${resolvedThemeData.footerLogo};
                        height: ${resolvedThemeData.footerLogoHeight};
                    }
                `}
                </style>
            }
        </>
    )
}
export default ColorSchema
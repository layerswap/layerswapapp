"use client";

import { Context, createContext, useContext, useState } from 'react';
import { ThemeData, THEME_COLORS } from '@layerswap/widget';

export type ThemeType = 'dark' | 'light';

interface ThemeContextType {
    theme: ThemeType;
    themeData: ThemeData | undefined;
    //changeTheme: (theme: ThemeType) => void;
    //borderRadius: string | undefined;
    //setBorderRadius: (borderRadius: ThemeData['borderRadius']) => void;
    //updateThemeDataBorderRadius: (borderRadius: ThemeData['borderRadius']) => void;
    updateTheme: <K extends keyof ThemeData> (prop: K, value: ThemeData[K]) => void;
    resetThemeData: () => void;
}

interface KeyValueContextPair {
    [key: string]: ThemeData | undefined;

}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export const ThemeProvider = ({ children }: { children: React.ReactNode }) => {
    const [theme, setTheme] = useState<ThemeType>('dark');
    //const [borderRadius, setBorderRadius] = useState<ThemeData['borderRadius'] | undefined>('default');

    const [themeData, setThemeData] = useState<ThemeData | undefined>(THEME_COLORS['default'])

    const resetThemeData = () => {
        setThemeData(THEME_COLORS['default']);
    };

    // const updateThemeDataBorderRadius = (borderRadius: ThemeData['borderRadius']) => {
    //     setThemeData((prevThemeData) => {
    //         if (!prevThemeData) return undefined;

    //         return {
    //             ...prevThemeData,
    //             borderRadius: borderRadius,
    //         };
    //     });
    // }

    const updateTheme = <K extends keyof ThemeData>(
        prop: K,
        value: ThemeData[K]
    ) => {
        setThemeData((prevTheme) => {
            if (!theme) return prevTheme;
            return {
                ...prevTheme,
                [prop]: value,
            };
        });
    };

    // const changeTheme = () => {
    //     setTheme((currentTheme) => (currentTheme === 'dark' ? 'light' : 'dark'));
    // };

    // const themeData: ThemeData | undefined =
    //     theme === 'light'
    //         ? { ...lightThemeData, borderRadius }
    //         : { borderRadius };

    return (
        <ThemeContext.Provider value={{ theme, themeData, /*borderRadius,*/ updateTheme, resetThemeData/*, changeTheme, setBorderRadius */ }}>
            {children}
        </ThemeContext.Provider>
    );
}

export function useTheme() {
    const data = useContext(ThemeContext as Context<ThemeContextType>);

    if (data === null) {
        throw new Error('useTheme must be used within a ThemeProvider');
    }

    return data;
}

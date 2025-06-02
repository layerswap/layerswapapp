"use client";

import { Context, createContext, useContext, useState } from 'react';
import { ThemeData, THEME_COLORS } from '@layerswap/widget';

export type ThemeType = 'dark' | 'light';

interface ThemeContextType {
    theme: ThemeType;
    themeData: ThemeData | undefined;

    updateTheme: <K extends keyof ThemeData> (prop: K, value: ThemeData[K]) => void;
    resetThemeData: () => void;
}

interface KeyValueContextPair {
    [key: string]: ThemeData | undefined;

}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export const ThemeProvider = ({ children }: { children: React.ReactNode }) => {
    const [theme, setTheme] = useState<ThemeType>('dark');

    const [themeData, setThemeData] = useState<ThemeData | undefined>(THEME_COLORS['default'])

    const resetThemeData = () => {
        setThemeData(THEME_COLORS['default']);
    };

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


    return (
        <ThemeContext.Provider value={{ theme, themeData, updateTheme, resetThemeData }}>
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

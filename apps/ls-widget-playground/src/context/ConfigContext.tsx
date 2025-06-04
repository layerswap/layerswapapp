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

interface featuredNetworkType {
    initialDirection: 'from' | 'to';
    network: string;
    oppositeDirectionOverrides?: 'onlyNetworks' | 'onlyExchanges' | string[];
}

interface NetworkContextType {
    featuredNetwork: featuredNetworkType | undefined;
    updateFeaturedNetwork: (
        direction: 'from' | 'to',
        network: string,
        opposite?: 'onlyNetworks' | 'onlyExchanges' | string[]
    ) => void;
    resetFeaturedNetwork: () => void;
}
const NetworkContext = createContext<NetworkContextType | undefined>(undefined);
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

export const NetworkProvider = ({ children }: { children: React.ReactNode }) => {
    const [featuredNetwork, setFeaturedNetwork] = useState<featuredNetworkType | undefined>(undefined);
    const updateFeaturedNetwork = (
        direction: 'from' | 'to',
        network: string,
        opposite: 'onlyNetworks' | 'onlyExchanges' | string[]
    ) => {

        setFeaturedNetwork({
            initialDirection: direction,
            network,
            oppositeDirectionOverrides: opposite,
        });
    };

    const resetFeaturedNetwork = () => {
        setFeaturedNetwork(undefined);
    };
    return (
        <NetworkContext.Provider value={{ featuredNetwork, updateFeaturedNetwork, resetFeaturedNetwork }}>
            {children}
        </NetworkContext.Provider>
    );
}

export function useTheme() {
    const data = useContext(ThemeContext as Context<ThemeContextType>);

    if (data === null) {
        throw new Error('useTheme must be used within a ThemeProvider');
    }

    return data;
}

export function useFeaturedNetwork() {
    const data = useContext(NetworkContext);
    if (!data) {
        throw new Error('useFeaturedNetwork must be used within a NetworkProvider');
    }
    return data;
}
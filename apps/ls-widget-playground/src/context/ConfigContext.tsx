"use client";
import { Context, createContext, useContext, useEffect, useState } from 'react';
import { ThemeData, THEME_COLORS } from '@layerswap/widget';


export interface featuredNetworkType {
    initialDirection?: 'from' | 'to';
    network?: string | undefined;
    oppositeDirectionOverrides?: 'onlyNetworks' | 'onlyExchanges' | string[] | undefined;
}

interface ContextType {
    themeData: ThemeData | undefined;
    themeName: string | undefined;
    featuredNetwork: featuredNetworkType | undefined;
    widgetRenderKey: number;
    customEvmSwitch: boolean;
    showLoading: boolean;
    showPanel: boolean;
    updateShowPanel: (val: boolean) => void;
    updateShowLoading: (val: boolean) => void;
    updateCustomEvmSwitch: (val: boolean) => void;
    updateFeaturedNetwork: <K extends keyof featuredNetworkType>(prop: K, value: featuredNetworkType[K]) => void;
    updateTheme: <K extends keyof ThemeData> (prop: K, value: ThemeData[K]) => void;
    updateWholeTheme: (themeData: ThemeData, themeName: string) => void
    resetData: () => void;
}

const WidgetContext = createContext<ContextType | undefined>(undefined);

export const ConfigProvider = ({ children }: { children: React.ReactNode }) => {
    const [themeData, setThemeData] = useState<{ theme: ThemeData | undefined, themeName?: string | undefined } | undefined>({ theme: THEME_COLORS['default'], themeName: 'default' });
    const [featuredNetwork, setFeaturedNetwork] = useState<featuredNetworkType | undefined>({ initialDirection: 'to' });
    const [widgetRenderKey, setWidgetRenderKey] = useState(0);
    const [customEvmSwitch, setCustomEvmSwitch] = useState(false);
    const [showLoading, setShowLoading] = useState(false);
    const [showPanel, setShowPanel] = useState(true);

    const bumpWidgetKey = () => {
        setWidgetRenderKey(prev => prev + 1);
    };

    useEffect(() => {
        bumpWidgetKey()
    }, [featuredNetwork?.network, featuredNetwork?.initialDirection, customEvmSwitch, showLoading])

    const resetData = () => {
        setThemeData({ theme: THEME_COLORS['default'], themeName: 'default' });
        setFeaturedNetwork({ initialDirection: 'to' });
        if (featuredNetwork) {
            bumpWidgetKey();
        }
        setCustomEvmSwitch(false);
        setShowLoading(false);
    };

    function updateShowPanel(val: boolean) {
        setShowPanel(val);
    }

    function updateShowLoading(val: boolean) {
        setShowLoading(val);
    }

    function updateCustomEvmSwitch(val: boolean) {
        setCustomEvmSwitch(val);
    }

    function updateWholeTheme(themeData: ThemeData, themeName: string) {
        setThemeData({ theme: themeData, themeName })
    }

    function updateTheme<K extends keyof ThemeData>(
        prop: K,
        value: ThemeData[K]
    ): void {
        {
            setThemeData((prevTheme) => ({
                ...prevTheme,
                theme: {
                    ...prevTheme?.theme,
                    [prop]: value!,
                }
            }));
        }
    }

    const updateFeaturedNetwork = <K extends keyof featuredNetworkType>(
        prop: K,
        value: featuredNetworkType[K]
    ) => {
        setFeaturedNetwork((prev) => ({
            ...(prev ?? {}),
            [prop]: value,
        }));
    };

    return (
        <WidgetContext.Provider value={{
            themeData: themeData?.theme, themeName: themeData?.themeName, featuredNetwork, widgetRenderKey, customEvmSwitch, showLoading, showPanel,
            updateTheme, updateWholeTheme, updateFeaturedNetwork, resetData, updateCustomEvmSwitch, updateShowLoading, updateShowPanel,
        }}>
            {children}
        </WidgetContext.Provider>
    );
}

export function useWidgetContext() {
    const data = useContext(WidgetContext as Context<ContextType>);
    if (data === null) {
        throw new Error('useTheme must be used within a ThemeProvider');
    }
    return data;
}

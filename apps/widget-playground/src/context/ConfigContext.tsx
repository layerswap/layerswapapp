"use client";
import { Context, createContext, Dispatch, SetStateAction, useContext, useEffect, useMemo, useState } from 'react';
import { ThemeData, THEME_COLORS, LayerswapWidgetConfig } from '@layerswap/widget';


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
    actionText: string;
    config: LayerswapWidgetConfig;
    updateActionText: (val: string) => void;
    updateShowPanel: (val: boolean) => void;
    updateShowLoading: (val: boolean) => void;
    updateCustomEvmSwitch: (val: boolean) => void;
    updateFeaturedNetwork: <K extends keyof featuredNetworkType>(prop: K, value: featuredNetworkType[K]) => void;
    updateTheme: <K extends keyof ThemeData> (prop: K, value: ThemeData[K]) => void;
    updateWholeTheme: Dispatch<SetStateAction<{
        theme: ThemeData | undefined;
        themeName?: string | undefined;
    } | undefined>>
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
    const [actionText, setActionText] = useState('');

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
        setActionText('Next');
    };

    function updateTheme<K extends keyof ThemeData>(prop: K, value: ThemeData[K]) {
        setThemeData((prev) => {
            const base: ThemeData = prev?.theme ?? THEME_COLORS['default'];
            return {
                ...prev,
                theme: {
                    ...base,
                    [prop]: value,
                },
            };
        });
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

    const config: LayerswapWidgetConfig = useMemo(() => {
        return {
            theme: themeData?.theme,
            featuredNetwork: (featuredNetwork?.initialDirection && featuredNetwork?.network
                ? {
                    initialDirection: featuredNetwork.initialDirection,
                    network: featuredNetwork.network,
                    oppositeDirectionOverrides: featuredNetwork.oppositeDirectionOverrides,
                }
                : undefined),
            actionText
        }
    }, [themeData, featuredNetwork, actionText])

    return (
        <WidgetContext.Provider value={{
            themeData: themeData?.theme, themeName: themeData?.themeName, featuredNetwork, widgetRenderKey, customEvmSwitch, showLoading, showPanel, actionText, config,
            updateTheme, updateWholeTheme: setThemeData, updateFeaturedNetwork, resetData, updateCustomEvmSwitch: setCustomEvmSwitch, updateShowLoading: setShowLoading, updateShowPanel: setShowPanel, updateActionText: setActionText,
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

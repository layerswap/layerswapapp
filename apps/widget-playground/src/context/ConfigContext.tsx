"use client";
import { Context, createContext, Dispatch, SetStateAction, useContext, useEffect, useMemo, useState } from 'react';
import { ThemeData, THEME_COLORS, LayerswapWidgetConfig } from '@layerswap/widget';
import { InitialSettings } from '@layerswap/widget/types';

interface ContextType {
    themeData: ThemeData | undefined;
    themeName: string | undefined;
    widgetRenderKey: number;
    customEvmSwitch: boolean;
    showLoading: boolean;
    showPanel: boolean;
    actionText: string;
    initialValues: InitialSettings
    config: LayerswapWidgetConfig;
    updateActionText: (val: string) => void;
    updateShowPanel: (val: boolean) => void;
    updateShowLoading: (val: boolean) => void;
    updateCustomEvmSwitch: (val: boolean) => void;
    updateTheme: <K extends keyof ThemeData> (prop: K, value: ThemeData[K]) => void;
    updateWholeTheme: Dispatch<SetStateAction<{
        theme: ThemeData | undefined;
        themeName?: string | undefined;
    } | undefined>>
    updateInitialValues: <K extends keyof InitialSettings>(key: K, value: InitialSettings[K] | undefined) => void;
    resetData: () => void;
}

const WidgetContext = createContext<ContextType | undefined>(undefined);

export const ConfigProvider = ({ children }: { children: React.ReactNode }) => {
    const [themeData, setThemeData] = useState<{ theme: ThemeData | undefined, themeName?: string | undefined } | undefined>({
        theme: {
            ...THEME_COLORS['default'],
            header: {
                hideMenu: false,
                hideTabs: false,
                hideWallets: false,
            },
            hidePoweredBy: false,
        },
        themeName: 'default'
    });
    const [widgetRenderKey, setWidgetRenderKey] = useState(0);
    const [customEvmSwitch, setCustomEvmSwitch] = useState(false);
    const [showLoading, setShowLoading] = useState(false);
    const [showPanel, setShowPanel] = useState(true);
    const [actionText, setActionText] = useState('');
    const [initialValues, setInitialSettings] = useState<InitialSettings>({});
    const bumpWidgetKey = () => {
        setWidgetRenderKey(prev => prev + 1);
    };

    useEffect(() => {
        bumpWidgetKey()
    }, [customEvmSwitch, showLoading, initialValues])

    const resetData = () => {
        setThemeData({
            theme: {
                ...THEME_COLORS['default'],
                header: {
                    hideMenu: false,
                    hideTabs: false,
                    hideWallets: false,
                },
                hidePoweredBy: false,
            },
            themeName: 'default'
        });
        setInitialSettings({});
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

    const updateInitialValues = <K extends keyof InitialSettings>(key: K, value: InitialSettings[K] | undefined) => {
        setInitialSettings(prev => {
            if (value === undefined) {
                const { [key]: _, ...rest } = prev;
                return rest as InitialSettings;
            }
            return { ...prev, [key]: value };
        });
    };

    const config: LayerswapWidgetConfig = useMemo(() => {
        return {
            theme: themeData?.theme,
            actionText,
            initialValues
        }
    }, [themeData, actionText, initialValues])

    return (
        <WidgetContext.Provider value={{
            themeData: themeData?.theme, themeName: themeData?.themeName, widgetRenderKey, customEvmSwitch, showLoading, showPanel, actionText, initialValues, config,
            updateTheme, updateWholeTheme: setThemeData, resetData, updateCustomEvmSwitch: setCustomEvmSwitch, updateShowLoading: setShowLoading, updateShowPanel: setShowPanel, updateActionText: setActionText, updateInitialValues
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

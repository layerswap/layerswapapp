"use client";
import { Context, createContext, Dispatch, FC, SetStateAction, useContext, useEffect, useMemo, useState } from 'react';
import { ThemeData, THEME_COLORS, LayerswapWidgetConfig, type DepositProps } from '@layerswap/widget';
import { InitialSettings } from '@layerswap/widget/types';

export type WidgetType = 'swap' | 'deposit';

export type PlaygroundDepositProps = Omit<DepositProps, 'partner'>;

const DEFAULT_DEPOSIT_PROPS: PlaygroundDepositProps = {
    mode: 'button',
    showDestinationAddress: false,
    title: 'Deposit',
    buttonLabel: 'Deposit',
    actionButtonText: 'Deposit',
    defaultAmountUsd: 1,
    destination: { network: 'STARKNET_MAINNET', tokens: ['ETH'] },
    destinationAddress: '0x04f5F8e5cDae95A5C1B84b97f7fd7fEff3463325C97Cc84D2830e1150Acf6820',
};

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
    widgetType: WidgetType;
    depositProps: PlaygroundDepositProps;
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
    updateWidgetType: (val: WidgetType) => void;
    updateDepositProp: <K extends keyof PlaygroundDepositProps>(key: K, value: PlaygroundDepositProps[K]) => void;
    updateDepositProps: Dispatch<SetStateAction<PlaygroundDepositProps>>;
    resetData: () => void;
}

const WidgetContext = createContext<ContextType | undefined>(undefined);

export const ConfigProvider: FC<{ children: React.ReactNode }> = ({ children }) => {
    const [themeData, setThemeData] = useState<{ theme: ThemeData | undefined, themeName?: string | undefined } | undefined>({
        theme: {
            ...THEME_COLORS['default'],
        },
        themeName: 'default'
    });
    const [widgetRenderKey, setWidgetRenderKey] = useState(0);
    const [customEvmSwitch, setCustomEvmSwitch] = useState(false);
    const [showLoading, setShowLoading] = useState(false);
    const [showPanel, setShowPanel] = useState(true);
    const [actionText, setActionText] = useState('');
    const [initialValues, setInitialSettings] = useState<InitialSettings>({});
    const [widgetType, setWidgetType] = useState<WidgetType>('swap');
    const [depositProps, setDepositProps] = useState<PlaygroundDepositProps>(DEFAULT_DEPOSIT_PROPS);
    const bumpWidgetKey = () => {
        setWidgetRenderKey(prev => prev + 1);
    };

    useEffect(() => {
        bumpWidgetKey()
    }, [customEvmSwitch, showLoading, initialValues, widgetType, depositProps])

    const resetData = () => {
        setThemeData({
            theme: {
                ...THEME_COLORS['default'],
            },
            themeName: 'default'
        });
        setInitialSettings({});
        setCustomEvmSwitch(false);
        setShowLoading(false);
        setActionText('');
        setWidgetType('swap');
        setDepositProps(DEFAULT_DEPOSIT_PROPS);
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

    const updateDepositProp = <K extends keyof PlaygroundDepositProps>(key: K, value: PlaygroundDepositProps[K]) => {
        setDepositProps(prev => ({ ...prev, [key]: value }));
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
            widgetType, depositProps,
            updateTheme, updateWholeTheme: setThemeData, resetData, updateCustomEvmSwitch: setCustomEvmSwitch, updateShowLoading: setShowLoading, updateShowPanel: setShowPanel, updateActionText: setActionText, updateInitialValues,
            updateWidgetType: setWidgetType, updateDepositProp, updateDepositProps: setDepositProps,
        }}>
            <>
                {children}
            </>
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

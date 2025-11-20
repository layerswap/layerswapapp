import { LayerswapProvider, LayerSwapSettings, ThemeData } from "@layerswap/widget"
import { useRouter } from "next/router"
import { ComponentProps, ReactNode } from "react"
import { updateFormBulk } from "./utils/updateForm"
import { removeSwapPath, setSwapPath } from "./utils/updateSwapPath"
import {
    createEVMProvider,
    createStarknetProvider,
    createFuelProvider,
    createParadexProvider,
    createBitcoinProvider,
    createImmutableXProvider,
    createTONProvider,
    createSVMProvider,
    createTronProvider,
    createImmutablePassportProvider
} from "@layerswap/wallets";
import { ParsedUrlQuery } from "querystring"

type LayerswapProviderComponentProps = ComponentProps<typeof LayerswapProvider>;

type WidgetWrapperRenderProps = {
    config: LayerswapProviderComponentProps['config'];
    walletProviders?: LayerswapProviderComponentProps['walletProviders'];
    callbacks?: LayerswapProviderComponentProps['callbacks'];
}

type WidgetWrapperProps<T extends Record<string, unknown> = Record<string, never>> = T & {
    children: ReactNode;
    settings?: LayerSwapSettings;
    themeData?: ThemeData | null;
    apiKey?: string;
    initialValues?: ParsedUrlQuery;
    callbacks?: LayerswapProviderComponentProps['callbacks'];
    walletProviders?: LayerswapProviderComponentProps['walletProviders'];
    configOverrides?: Partial<LayerswapProviderComponentProps['config']>;
    enableSwapCallbacks?: boolean;
};

const WidgetWrapper = <T extends Record<string, unknown>>({
    children,
    settings,
    themeData,
    apiKey,
    initialValues,
    callbacks,
    walletProviders,
    configOverrides,
    enableSwapCallbacks = false,
}: WidgetWrapperProps<T>) => {
    const router = useRouter()

    const imtblPassportConfig = typeof window !== 'undefined' ? {
        clientId: process.env.NEXT_PUBLIC_IMMUTABLE_CLIENT_ID || '',
        publishableKey: process.env.NEXT_PUBLIC_IMMUTABLE_PUBLISHABLE_KEY || '',
        redirectUri: router.basePath ? `${window.location.origin}${router.basePath}/imtblRedirect` : `${window.location.origin}/imtblRedirect`,
        logoutRedirectUri: router.basePath ? `${window.location.origin}${router.basePath}/` : `${window.location.origin}/`
    } : undefined

    const walletConnectConfigs = {
        projectId: process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID || '',
        name: 'Layerswap',
        description: 'Layerswap App',
        url: 'https://layerswap.io/app/',
        icons: ['https://www.layerswap.io/app/symbol.png']
    }

    const defaultWalletProviders = [
        createEVMProvider({ walletConnectConfigs }),
        createStarknetProvider({ walletConnectConfigs }),
        createFuelProvider(),
        createParadexProvider(),
        createBitcoinProvider(),
        createImmutableXProvider(),
        createTONProvider({
            tonConfigs: {
                manifestUrl: 'https://layerswap.io/app/tonconnect-manifest.json',
                tonApiKey: process.env.NEXT_PUBLIC_TON_API_KEY || ''
            }
        }),
        createSVMProvider({ walletConnectConfigs }),
        createTronProvider(),
        createImmutablePassportProvider({ imtblPassportConfig })
    ]

    const resolvedWalletProviders = walletProviders ?? defaultWalletProviders

    const themeOverrides: Partial<ThemeData> = {
        borderRadius: 'default',
        enablePortal: true,
        enableWideVersion: true,
        hidePoweredBy: true,
    }

    const baseTheme: ThemeData = {
        ...(themeData ?? {}),
        ...themeOverrides,
    } as ThemeData

    const apiVersion = process.env.NEXT_PUBLIC_API_VERSION as ('mainnet' | 'testnet') | undefined

    const baseConfig: LayerswapProviderComponentProps['config'] = {
        theme: baseTheme,
        ...(apiKey ? { apiKey } : {}),
        ...(settings ? { settings } : {}),
        ...(initialValues ? { initialValues } : {}),
        ...(apiVersion ? { version: apiVersion } : {}),
    }

    const mergedConfig = {
        ...baseConfig,
        ...configOverrides,
    } as LayerswapProviderComponentProps['config']

    const defaultSwapCallbacks = enableSwapCallbacks ? {
        onFormChange(formData: Parameters<NonNullable<LayerswapProviderComponentProps['callbacks']>['onFormChange']>[0]) {
            updateFormBulk(formData);
        },
        onSwapCreate(swapData: Parameters<NonNullable<LayerswapProviderComponentProps['callbacks']>['onSwapCreate']>[0]) {
            setSwapPath(swapData.swap.id, router)
        },
        onSwapModalStateChange(open: Parameters<NonNullable<LayerswapProviderComponentProps['callbacks']>['onSwapModalStateChange']>[0]) {
            if (!open) {
                removeSwapPath(router)
            }
        }
    } : undefined

    const resolvedCallbacks = callbacks ?? defaultSwapCallbacks


    return <LayerswapProvider
        config={mergedConfig}
        callbacks={resolvedCallbacks}
        walletProviders={resolvedWalletProviders}
    >
        {children}
    </LayerswapProvider>
}

export default WidgetWrapper;
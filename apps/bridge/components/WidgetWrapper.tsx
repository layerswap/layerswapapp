import { LayerswapProvider, LayerSwapSettings, ThemeData } from "@layerswap/widget"
import { useRouter } from "next/router"
import { ComponentProps, ReactNode, useMemo } from "react"
import { updateFormBulk } from "./utils/updateForm"
import { removeSwapPath, setMenuPath, setSwapPath } from "./utils/updatePath"
import { getDefaultProviders } from "@layerswap/wallets";
import { QueryParams } from "../helpers/querryHelper"
import { logError } from "./utils/logError"

type LayerswapProviderComponentProps = ComponentProps<typeof LayerswapProvider>;

type WidgetWrapperProps<T extends Record<string, unknown> = Record<string, never>> = T & {
    children: ReactNode;
    settings?: LayerSwapSettings;
    themeData?: ThemeData | null;
    apiKey?: string;
    initialValues?: QueryParams;
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

    const walletConnectConfigs = {
        projectId: process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID,
        name: 'Layerswap',
        description: 'Layerswap App',
        url: 'https://layerswap.io/app/',
        icons: ['https://www.layerswap.io/app/symbol.png']
    }

    const immutablePassportConfig = useMemo(() => {
        const clientId = process.env.NEXT_PUBLIC_IMMUTABLE_CLIENT_ID
        const publishableKey = process.env.NEXT_PUBLIC_IMMUTABLE_PUBLISHABLE_KEY
        if (!clientId || !publishableKey) return undefined
        if (typeof window === 'undefined') return undefined
        const basePath = router.basePath
        const origin = window.location.origin
        return {
            clientId,
            publishableKey,
            redirectUri: `${origin}${basePath}/imtblRedirect`,
            logoutRedirectUri: `${origin}${basePath}/`,
        }
    }, [router.basePath])

    const tonConfig = useMemo(() => {
        const tonApiKey = process.env.NEXT_PUBLIC_TON_API_KEY
        if (typeof window === 'undefined') return undefined
        const manifestUrl = `${window.location.origin}${router.basePath}/tonconnect-manifest.json`
        return {
            tonApiKey: tonApiKey || '',
            manifestUrl,
        }
    }, [router.basePath])

    const defaultWalletProviders = useMemo(() => getDefaultProviders({
        walletConnect: walletConnectConfigs,
        ton: tonConfig,
        immutablePassport: immutablePassportConfig,
    }), [tonConfig, immutablePassportConfig])

    const resolvedWalletProviders = walletProviders ?? defaultWalletProviders

    const themeOverrides: Partial<ThemeData> = {
        borderRadius: 'default',
        enablePortal: true,
        enableWideVersion: true,
        hidePoweredBy: true,
    }

    const baseTheme: ThemeData = {
        ...(themeData ?? {}),
        ...(!router.query.theme ? themeOverrides : {}),
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
        onFormChange(formData) {
            updateFormBulk(formData);
        },
        // onSwapCreate(swapData) {
        //     setSwapPath(swapData.swap.id, router)
        // },
        // onSwapModalStateChange(open) {
        //     if (!open) {
        //         removeSwapPath(router)
        //     }
        // },
        onMenuNavigationChange(path) {
            setMenuPath(path, router)
        },
        onError: logError,
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
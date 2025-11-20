import { LayerswapProvider, LayerSwapSettings, Swap, ThemeData } from "@layerswap/widget"
import { useRouter } from "next/router"
import { FC } from "react"
import { updateFormBulk } from "../../utils/updateForm"
import { removeSwapPath, setSwapPath } from "../../utils/updateSwapPath"
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

const SwapPage: FC<{ settings: LayerSwapSettings, themeData: ThemeData | null, apiKey: string, initialValues: ParsedUrlQuery }> = ({ settings, themeData, apiKey, initialValues }) => {
    const router = useRouter()

    const imtblPassportConfig = typeof window !== 'undefined' ? {
        clientId: process.env.NEXT_PUBLIC_IMMUTABLE_CLIENT_ID || '',
        publishableKey: process.env.NEXT_PUBLIC_IMMUTABLE_PUBLISHABLE_KEY || '',
        redirectUri: router.basePath ? `${window.location.origin}${router.basePath}/imtblRedirect` : `${window.location.origin}/imtblRedirect`,
        logoutRedirectUri: router.basePath ? `${window.location.origin}${router.basePath}/` : `${window.location.origin}/`
    } : undefined

    const walletConnectConfigs= {
        projectId: process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID || '',
        name: 'Layerswap',
        description: 'Layerswap App',
        url: 'https://layerswap.io/app/',
        icons: ['https://www.layerswap.io/app/symbol.png']
    }

    const walletProviders = [
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

    return <LayerswapProvider
        config={{
            apiKey,
            version: process.env.NEXT_PUBLIC_API_VERSION as 'mainnet' | 'testnet',
            settings,
            theme: { ...themeData, borderRadius: 'default', enablePortal: true, enableWideVersion: true, hidePoweredBy: true },
        }}
        callbacks={{
            onFormChange(formData) {
                updateFormBulk(formData);
            },
            onSwapCreate(swapData) {
                setSwapPath(swapData.swap.id, router)
            },
            onSwapModalStateChange(open) {
                if (!open) {
                    removeSwapPath(router)
                }
            }
        }}
        walletProviders={walletProviders}
    >
        <Swap/>
    </LayerswapProvider>
}

export default SwapPage
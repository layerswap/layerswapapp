import { LayerswapProvider, LayerSwapSettings, Swap, ThemeData } from "@layerswap/widget"
import { useRouter } from "next/router"
import { FC } from "react"
import { updateFormBulk } from "../../utils/updateForm"
import { removeSwapPath, setSwapPath } from "../../utils/updateSwapPath"
import { EVMProvider, FuelProvider, ParadexProvider, StarknetProvider, BitcoinProvider, ImmutableXProvider, TonProvider, SVMProvider, TronProvider, ImtblPassportProvider } from "@layerswap/wallets";
import { ParsedUrlQuery } from "querystring"
import { logError } from "../../utils/logError"

const SwapPage: FC<{ settings: LayerSwapSettings, themeData: ThemeData | null, apiKey: string, initialValues: ParsedUrlQuery }> = ({ settings, themeData, apiKey, initialValues }) => {
    const router = useRouter()

    const imtblPassportConfigs = typeof window !== 'undefined' ? {
        clientId: process.env.NEXT_PUBLIC_IMMUTABLE_CLIENT_ID || '',
        publishableKey: process.env.NEXT_PUBLIC_IMMUTABLE_PUBLISHABLE_KEY || '',
        redirectUri: router.basePath ? `${window.location.origin}${router.basePath}/imtblRedirect` : `${window.location.origin}/imtblRedirect`,
        logoutRedirectUri: router.basePath ? `${window.location.origin}${router.basePath}/` : `${window.location.origin}/`
    } : undefined

    return <LayerswapProvider
        config={{
            apiKey,
            version: process.env.NEXT_PUBLIC_API_VERSION as 'mainnet' | 'testnet',
            settings,
            theme: { ...themeData, borderRadius: 'default', enablePortal: true, enableWideVersion: true, hidePoweredBy: true },
            imtblPassport: imtblPassportConfigs,
            tonConfigs: {
                'manifestUrl': 'https://layerswap.io/app/tonconnect-manifest.json',
                'tonApiKey': process.env.NEXT_PUBLIC_TON_API_KEY || ''
            },
            initialValues
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
            },
            onError: logError,
        }}
        walletProviders={[EVMProvider, StarknetProvider, FuelProvider, ParadexProvider, BitcoinProvider, ImmutableXProvider, TonProvider, SVMProvider, TronProvider, ImtblPassportProvider]}
    >
        <Swap />
    </LayerswapProvider>
}

export default SwapPage
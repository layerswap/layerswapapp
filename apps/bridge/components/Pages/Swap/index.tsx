import { LayerswapProvider, LayerSwapSettings, Swap, ThemeData } from "@layerswap/widget"
import { useRouter } from "next/router"
import { FC } from "react"
import { updateFormBulk } from "../../utils/updateForm"
import { removeSwapPath, setSwapPath } from "../../utils/updateSwapPath"
import { evmWalletProvider } from "@layerswap/wallet-evm";
import { bitcoinProvider } from "@layerswap/wallet-bitcoin";

const SwapPage: FC<{ settings: LayerSwapSettings, themeData: ThemeData | null, apiKey: string }> = ({ settings, themeData, apiKey }) => {
    const router = useRouter()
    const imtblPassportConfigs = typeof window !== 'undefined' ? {
        appBasePath: router.basePath,
        clientId: process.env.NEXT_PUBLIC_IMMUTABLE_CLIENT_ID || '',
        publishableKey: process.env.NEXT_PUBLIC_IMMUTABLE_PUBLISHABLE_KEY || '',
        redirectUri: router.basePath ? `${window.location.origin}${router.basePath}/imtblRedirect` : `${window.location.origin}/imtblRedirect`
    } : undefined

    return <LayerswapProvider
        integrator='layerswap'
        apiKey={apiKey}
        version={process.env.NEXT_PUBLIC_API_VERSION as 'mainnet' | 'testnet'}
        settings={settings}
        themeData={{ ...themeData as any, borderRadius: 'default', enablePortal: true }}
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
        imtblPassport={imtblPassportConfigs}
        walletProviders={[evmWalletProvider, bitcoinProvider]}
    >
        <Swap />
    </LayerswapProvider>
}

export default SwapPage
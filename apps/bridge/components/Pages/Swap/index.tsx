import { LayerswapProvider, LayerSwapSettings, Swap, ThemeData } from "@layerswap/widget"
import { useRouter } from "next/router"
import { FC } from "react"
import { updateFormBulk } from "../../utils/updateForm"
import { removeSwapPath, setSwapPath } from "../../utils/updateSwapPath"
import { EVMProvider } from "@layerswap/wallet-evm";
import { FuelProvider } from "@layerswap/wallet-fuel";
import { ParadexProvider } from "@layerswap/wallet-paradex";
import { StarknetProvider } from "@layerswap/wallet-starknet";
import { BitcoinProvider } from "@layerswap/wallet-bitcoin";
import { ImmutableXProvider } from "@layerswap/wallet-imtbl-x";
import { TonProvider } from "@layerswap/wallet-ton";
import { SVMProvider } from "@layerswap/wallet-svm";
import { TronProvider } from "@layerswap/wallet-tron";
import { ImtblPassportProvider } from "@layerswap/wallet-imtbl-passport";

const SwapPage: FC<{ settings: LayerSwapSettings, themeData: ThemeData | null, apiKey: string }> = ({ settings, themeData, apiKey }) => {
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
            theme: { ...themeData, borderRadius: 'default', enablePortal: true, enableWideVersion: false, hidePoweredBy: true },
            imtblPassport: imtblPassportConfigs
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
        walletProviders={[EVMProvider, StarknetProvider, FuelProvider, ParadexProvider, BitcoinProvider, ImmutableXProvider, TonProvider, SVMProvider, TronProvider, ImtblPassportProvider]}
    >
        <Swap />
    </LayerswapProvider>
}

export default SwapPage
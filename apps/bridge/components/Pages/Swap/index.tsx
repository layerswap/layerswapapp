import { LayerswapProvider, LayerSwapSettings, Swap, ThemeData } from "@layerswap/widget"
import { useRouter } from "next/router"
import { FC } from "react"
import { updateFormBulk } from "../../utils/updateForm"
import { removeSwapPath, setSwapPath } from "../../utils/updateSwapPath"
// import { useEVM } from "@layerswap/wallet-evm";
// import { useBitcoin } from "@layerswap/wallet-bitcoin";
// import { useStarknet } from "@layerswap/wallet-starknet";
// import { useTron } from "@layerswap/wallet-tron";
// import { useTON } from "@layerswap/wallet-ton";
// import { useFuel } from "@layerswap/wallet-fuel";
// import { useImtblX } from "@layerswap/wallet-imtblX";
// import { useSVM } from "@layerswap/wallet-svm";

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
        // walletProviders={[useEVM]}
    >
        <Swap />
    </LayerswapProvider>
}

export default SwapPage
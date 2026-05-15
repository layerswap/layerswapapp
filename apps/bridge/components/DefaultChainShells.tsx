import { FC, ReactNode, useMemo } from "react"
import {
    createEVMShell,
    createStarknetShell,
    createFuelShell,
    createParadexShell,
    createBitcoinShell,
    createTONShell,
    createSVMShell,
    createTronShell,
    createImmutablePassportShell,
    type WalletProviderShell,
} from "@layerswap/wallets"
import { useRouter } from "next/router"

// Composes every chain shell the bridge ships with into a single nested
// JSX subtree. The order here is the legacy resolution priority from
// getDefaultProviders: a network supported by multiple chains resolves
// to the outermost shell first. Adding/removing chains is a JSX change,
// not a runtime array mutation — the React tree stays stable for the
// lifetime of the app.
//
// Each shell is created via createXxxShell() which routes through
// defineWalletProvider — see packages/widget/src/lib/defineWalletProvider.tsx.

const DefaultChainShells: FC<{ children: ReactNode }> = ({ children }) => {
    const router = useRouter()

    const shells = useMemo(() => {
        const imtblPassportConfig = typeof window !== 'undefined' ? {
            clientId: process.env.NEXT_PUBLIC_IMMUTABLE_CLIENT_ID || '',
            publishableKey: process.env.NEXT_PUBLIC_IMMUTABLE_PUBLISHABLE_KEY || '',
            redirectUri: router.basePath
                ? `${window.location.origin}${router.basePath}/imtblRedirect`
                : `${window.location.origin}/imtblRedirect`,
            logoutRedirectUri: router.basePath
                ? `${window.location.origin}${router.basePath}/`
                : `${window.location.origin}/`,
        } : undefined

        const walletConnectConfigs = {
            projectId: process.env.NEXT_PUBLIC_WALLET_CONNECT_PROJECT_ID || '',
            name: 'Layerswap',
            description: 'Layerswap App',
            url: 'https://layerswap.io/app/',
            icons: ['https://www.layerswap.io/app/symbol.png'],
        }

        const tonConfigs = {
            tonApiKey: process.env.NEXT_PUBLIC_TON_API_KEY || '',
            manifestUrl: 'https://layerswap.io/app/tonconnect-manifest.json',
        }

        const list: WalletProviderShell[] = [
            createEVMShell({ walletConnectConfigs }),
            createStarknetShell(),
            createFuelShell(),
            createParadexShell(),
            createBitcoinShell(),
            createTONShell({ tonConfigs }),
            createSVMShell({ walletConnectConfigs }),
            createTronShell(),
        ]
        if (imtblPassportConfig) {
            list.push(createImmutablePassportShell({ imtblPassportConfig }))
        }
        return list
    }, [router.basePath])

    // Reduce-right builds the JSX tree from the innermost child outward,
    // matching the order in `shells`: shells[0] (EVM) becomes the
    // outermost wrapper. This is the only place the bridge composes
    // chain shells; everything else just renders <DefaultChainShells>.
    return <>{shells.reduceRight<ReactNode>(
        (acc, Shell) => <Shell>{acc}</Shell>,
        children,
    )}</>
}

export default DefaultChainShells

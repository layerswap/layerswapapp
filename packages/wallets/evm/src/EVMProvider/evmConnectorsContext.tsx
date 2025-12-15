import { createContext, useContext, useMemo, useState } from 'react'
import { resolveConnector, resolveWallets, WalletConnectWallet } from '../connectors/resolveConnectors';
import { CreateConnectorFn } from 'wagmi';
import { coinbaseWallet, walletConnect, metaMask } from '@wagmi/connectors'
import { walletConnect as customWalletConnect } from '../connectors/resolveConnectors/walletConnect';
import { browserInjected } from '../connectors/browserInjected';
import { isMobile, usePersistedState } from '@layerswap/widget/internal';
import { WalletConnectConfig } from '..';

type ContextType = {
    connectors: CreateConnectorFn[],
    walletConnectConnectors: WalletConnectWallet[],
    addToAdditionalWallets: (connector: WalletConnectWallet) => void
}

const EvmConnectorsContext = createContext<ContextType | null>(null);

export const featuredWalletsIds = [
    'metamask',
    'argent',
    'rainbow',
    'bitkeep',
    'okx-wallet',
]

const resolveFeaturedWallets = (wallets: WalletConnectWallet[]) => {
    return wallets.filter(wallet => featuredWalletsIds.includes(wallet.id.toLowerCase()))
}

type EvmConnectorsProviderProps = {
    children: React.ReactNode
    walletConnectConfigs?: WalletConnectConfig
}

export const HIDDEN_WALLETCONNECT_ID = 'hiddenWalletConnect'

export function EvmConnectorsProvider({ children, walletConnectConfigs }: EvmConnectorsProviderProps) {

    const WALLETCONNECT_PROJECT_ID = walletConnectConfigs?.projectId || ''

    const wltcnnct_inited = useMemo(() => walletConnect({
        projectId: WALLETCONNECT_PROJECT_ID,
        showQrModal: isMobile(),
        customStoragePrefix: 'walletConnect'
    }), [WALLETCONNECT_PROJECT_ID])

    const { additionalConnectors, allWallets, addToAdditionalWallets, featuredConnectors } = useWalletConnectors(WALLETCONNECT_PROJECT_ID)

    // Hidden WalletConnect connector for dynamic wallets - not shown in the list
    // Uses custom walletConnect with unique ID so we can identify it
    const hiddenWalletConnectConnector = useMemo(() => customWalletConnect({
        id: HIDDEN_WALLETCONNECT_ID,
        name: 'Hidden WalletConnect',
        rdns: '',
        type: 'other',
        mobile: { native: '', universal: '' },
        icon: '',
        projectId: WALLETCONNECT_PROJECT_ID,
        showQrModal: false,
    }), [WALLETCONNECT_PROJECT_ID])

    const defaultConnectors: CreateConnectorFn[] = useMemo(() => [
        metaMask({
            dappMetadata: {
                name: walletConnectConfigs?.name || 'Layerswap',
                url: walletConnectConfigs?.url || 'https://layerswap.io/app/',
                iconUrl: walletConnectConfigs?.icons?.[0] || 'https://layerswap.io/app/symbol.png'
            }
        }),
        coinbaseWallet({
            appName: walletConnectConfigs?.name || 'Layerswap',
            appLogoUrl: walletConnectConfigs?.icons?.[0] || 'https://layerswap.io/app/symbol.png'
        }),
        wltcnnct_inited,
        ...featuredConnectors,
        browserInjected(),
        hiddenWalletConnectConnector // Hidden connector for dynamic wallets
    ], [wltcnnct_inited, featuredConnectors, walletConnectConfigs]);

    const connectors = useMemo(() => {
        return [
            ...defaultConnectors,
            ...additionalConnectors
        ]
    }, [defaultConnectors, additionalConnectors]);

    return (
        <EvmConnectorsContext.Provider value={{
            connectors,
            walletConnectConnectors: allWallets,
            addToAdditionalWallets
        }}>
            {children}
        </EvmConnectorsContext.Provider>
    )
}

export function useEvmConnectors() {
    const data = useContext(EvmConnectorsContext);

    if (data === null) {
        throw new Error('useEvmConnectors must be used within a EvmConnectorsProvider');
    }

    return data;
}

const useWalletConnectors = (projectId: string) => {
    const [additionalWallets, setAdditionalWallets] = useState<WalletConnectWallet[]>([])
    let [recentConnectorNames, _] = usePersistedState<({ providerName?: string, connectorName?: string }[])>([], 'recentConnectors', 'localStorage');

    const addToAdditionalWallets = async (connector: WalletConnectWallet) => {
        setAdditionalWallets((prev) => [...prev.filter(v => v.name !== connector.name), connector])
    }

    // Wallets
    const allWallets = useMemo(() => resolveWallets(projectId), [projectId])
    const featuredWallets = useMemo(() => resolveFeaturedWallets(allWallets), [allWallets])
    const recentWallets = useMemo(() => {
        const filteredNames = recentConnectorNames.filter(c =>
            c.providerName === 'EVM'
            && c.connectorName
            && !featuredWalletsIds.includes(c.connectorName.toLowerCase())
        )
        return filteredNames.filter(con => allWallets.some(w => w.name.toLowerCase() === con?.connectorName?.toLowerCase())).map(c => {
            const wallet = allWallets.find(w => w.name.toLowerCase() === c?.connectorName?.toLowerCase())
            return wallet
        }).filter(wallet => wallet !== undefined)
    }, [recentConnectorNames, allWallets]);

    // Connectors
    const featuredConnectors = useMemo(() => {
        return featuredWallets.filter(wallet => wallet.name.toLowerCase() !== 'metamask').map(wallet => {
            return resolveConnector(wallet.name, projectId)
        })
    }, [featuredWallets, projectId])
    const additionalConnectors = useMemo(() => {
        const recentConnectors = recentWallets.map(wallet => {
            return resolveConnector(wallet?.name, projectId)
        })
        // const rest = additionalWallets.map(wallet => {
        //     return resolveConnector(wallet.name, projectId)
        // })
        return [
            ...recentConnectors,
            // ...rest
        ]
    }, [recentWallets, additionalWallets, projectId]);

    return { additionalConnectors, allWallets, addToAdditionalWallets, featuredConnectors }
}

import { createContext, useContext, useMemo, useState } from 'react'
import { resolveConnector, resolveWallets, WalletConnectWallet } from '../connectors/resolveConnectors';
import { CreateConnectorFn } from 'wagmi';
import { coinbaseWallet, walletConnect, metaMask } from '@wagmi/connectors'
import { browserInjected } from '../connectors/browserInjected';
import { isMobile, usePersistedState } from '@layerswap/widget/internal';
import { WalletConnectConfig } from '..';

type ContextType = {
    connectors: CreateConnectorFn[],
    walletConnectConnectors: WalletConnectWallet[],
    addWalletConnectWallet: (connector: WalletConnectWallet) => Promise<void>
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

export function EvmConnectorsProvider({ children, walletConnectConfigs }: EvmConnectorsProviderProps) {
    let [recentConnectors, _] = usePersistedState<({ providerName?: string, connectorName?: string }[])>([], 'recentConnectors', 'localStorage');
    const [walletConnectWallets, setWalletConnectWallets] = useState<WalletConnectWallet[]>([])

    const walletConnectConfig = walletConnectConfigs
    const WALLETCONNECT_PROJECT_ID = walletConnectConfig?.projectId || ''
    const wltcnnct_inited = useMemo(() => walletConnect({ 
        projectId: WALLETCONNECT_PROJECT_ID, 
        showQrModal: isMobile(), 
        customStoragePrefix: 'walletConnect' 
    }), [WALLETCONNECT_PROJECT_ID])

    // Resolve wallet list with projectId
    const _walletConnectWallets = useMemo(() => resolveWallets(WALLETCONNECT_PROJECT_ID), [WALLETCONNECT_PROJECT_ID])
    const featuredWallets = useMemo(() => resolveFeaturedWallets(_walletConnectWallets), [_walletConnectWallets])

    const addWalletConnectWallet = async (connector: WalletConnectWallet) => {
        setWalletConnectWallets((prev) => [...prev.filter(v => v.name !== connector.name), connector])
    }

    const initialRecentConnectors = useMemo(() => {
        const evmRecentConnectors = recentConnectors.filter(c =>
            c.providerName === 'EVM'
            && c.connectorName
            && !featuredWalletsIds.includes(c.connectorName.toLowerCase())
        )
        return evmRecentConnectors.filter(con => _walletConnectWallets.some(w => w.name.toLowerCase() === con?.connectorName?.toLowerCase())).map(c => {
            const connector = _walletConnectWallets.find(w => w.name.toLowerCase() === c?.connectorName?.toLowerCase())
            return connector!
        })
    }, [recentConnectors, _walletConnectWallets]);

    const resolvedFeaturedWallets = useMemo(() => {
        return featuredWallets.filter(wallet => wallet.name.toLowerCase() !== 'metamask').map(wallet => {
            return resolveConnector(wallet.name, WALLETCONNECT_PROJECT_ID)
        })
    }, [featuredWallets, WALLETCONNECT_PROJECT_ID]);

    const resolvedWalletConnectWallets = useMemo(() => {
        const resolvedInitialRecentConnectors = initialRecentConnectors.map(wallet => {
            return resolveConnector(wallet.name, WALLETCONNECT_PROJECT_ID)
        })
        const resolvedWalletConnectConnectors = walletConnectWallets.map(wallet => {
            return resolveConnector(wallet.name, WALLETCONNECT_PROJECT_ID)
        })
        return [
            ...resolvedInitialRecentConnectors,
            ...resolvedWalletConnectConnectors
        ]
    }, [walletConnectWallets, initialRecentConnectors, WALLETCONNECT_PROJECT_ID]);

    const defaultConnectors: CreateConnectorFn[] = useMemo(() => [
        metaMask({
            dappMetadata: {
                name: walletConnectConfig?.name ||'Layerswap',
                url: walletConnectConfig?.url || 'https://layerswap.io/app/',
                iconUrl: walletConnectConfig?.icons?.[0] || 'https://layerswap.io/app/symbol.png'
            }
        }),
        coinbaseWallet({
            appName: walletConnectConfig?.name || 'Layerswap',
            appLogoUrl: walletConnectConfig?.icons?.[0] || 'https://layerswap.io/app/symbol.png'
        }),
        wltcnnct_inited,
        ...resolvedFeaturedWallets,
        browserInjected()
    ], [wltcnnct_inited, resolvedFeaturedWallets, walletConnectConfig]);

    const connectors = useMemo(() => {
        return [
            ...defaultConnectors,
            ...resolvedWalletConnectWallets
        ]
    }, [defaultConnectors, resolvedWalletConnectWallets]);

    return (
        <EvmConnectorsContext.Provider value={{
            connectors,
            walletConnectConnectors: _walletConnectWallets,
            addWalletConnectWallet
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

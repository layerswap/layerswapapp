import { createContext, useContext, useEffect, useMemo, useState } from 'react'
import { resolveConnector, walletConnectWallets as _walletConnectWallets, WalletConnectWallet } from '../lib/wallets/connectors/resolveConnectors';
import { CreateConnectorFn } from 'wagmi';
import { coinbaseWallet, walletConnect } from '@wagmi/connectors'
import { browserInjected } from '../lib/wallets/connectors/browserInjected';
import { isMobile } from '../lib/isMobile';
import { usePersistedState } from '@/hooks/usePersistedState';
import AppSettings from '@/lib/AppSettings';

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

const WALLETCONNECT_PROJECT_ID = AppSettings.WalletConnectConfig.projectId
const wltcnnct_inited = walletConnect({ projectId: WALLETCONNECT_PROJECT_ID, showQrModal: isMobile(), customStoragePrefix: 'walletConnect' })
const featuredWallets = resolveFeaturedWallets(_walletConnectWallets)

export function EvmConnectorsProvider({ children }) {
    let [recentConnectors, _] = usePersistedState<({ providerName?: string, connectorName?: string }[])>([], 'recentConnectors', 'localStorage');
    const [walletConnectWallets, setWalletConnectWallets] = useState<WalletConnectWallet[]>([])

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
    }, [recentConnectors]);

    const resolvedFeaturedWallets = useMemo(() => {
        return featuredWallets.map(wallet => {
            return resolveConnector(wallet.name)
        })
    }, [featuredWallets]);

    const resolvedWalletConnectWallets = useMemo(() => {
        const resolvedInitialRecentConnectors = initialRecentConnectors.map(wallet => {
            return resolveConnector(wallet.name)
        })
        const resolvedWalletConnectConnectors = walletConnectWallets.map(wallet => {
            return resolveConnector(wallet.name)
        })
        return [
            ...resolvedInitialRecentConnectors,
            ...resolvedWalletConnectConnectors
        ]
    }, [walletConnectWallets, initialRecentConnectors]);

    const defaultConnectors: CreateConnectorFn[] = [
        coinbaseWallet({
            appName: 'Layerswap',
            appLogoUrl: 'https://layerswap.io/app/symbol.png',
        }),
        wltcnnct_inited,
        ...resolvedFeaturedWallets,
        browserInjected()
    ]

    const connectors = useMemo(() => {
        return [
            ...defaultConnectors,
            ...resolvedWalletConnectWallets
        ]
    }, [defaultConnectors, walletConnectWallets]);

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

import { createContext, useContext, useEffect, useMemo, useState } from 'react'
import { resolveConnector, walletConnectWallets as _walletConnectWallets, WalletConnectWallet } from '../lib/wallets/connectors/resolveConnectors';
import { CreateConnectorFn } from 'wagmi';
import { coinbaseWallet, walletConnect } from '@wagmi/connectors'
import { browserInjected } from '../lib/wallets/connectors/browserInjected';
import { isMobile } from '../lib/isMobile';
import { usePersistedState } from '@/hooks/usePersistedState';

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

const WALLETCONNECT_PROJECT_ID = process.env.NEXT_PUBLIC_WALLET_CONNECT_PROJECT_ID || '28168903b2d30c75e5f7f2d71902581b';
const wltcnnct_inited = walletConnect({ projectId: WALLETCONNECT_PROJECT_ID, showQrModal: isMobile(), customStoragePrefix: 'walletConnect' })
const featuredWallets = resolveFeaturedWallets(_walletConnectWallets)

export function EvmConnectorsProvider({ children }) {
    let [recentConnectors, _] = usePersistedState<({ providerName?: string, connectorName?: string }[])>([], 'recentConnectors', 'localStorage');
    const [walletConnectWallets, setWalletConnectWallets] = useState<CreateConnectorFn[]>([])

    const addWalletConnectWallet = async (connector: WalletConnectWallet) => {
        const resolvedConnector = resolveConnector(connector.name)
        setWalletConnectWallets((prev) => [...prev, resolvedConnector])
    }

    useEffect(() => {
        const evmRecentConnectors = recentConnectors.filter(c => c.providerName === 'evm' && c.connectorName)
        evmRecentConnectors.forEach(c => {
            if (!c.connectorName || featuredWalletsIds.includes(c.connectorName.toLowerCase())) {
                return;
            }
            const connector = _walletConnectWallets.find(w => w.id.toLowerCase() === c?.connectorName?.toLowerCase())
            if (connector) addWalletConnectWallet(connector)
        })
    }, [recentConnectors])

    const resolvedWalletConnectWallets = useMemo(() => {
        return _walletConnectWallets.filter(w => !featuredWalletsIds.includes(w.id))
    }, [_walletConnectWallets]);

    const resolvedFeaturedWallets = useMemo(() => {
        return featuredWallets.map(wallet => {
            return resolveConnector(wallet.name)
        })
    }, [featuredWallets]);

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
            ...walletConnectWallets
        ]
    }, [defaultConnectors, walletConnectWallets]);

    return (
        <EvmConnectorsContext.Provider value={{
            connectors,
            walletConnectConnectors: resolvedWalletConnectWallets,
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

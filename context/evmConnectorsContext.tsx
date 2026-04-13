import { createContext, useCallback, useContext, useMemo } from 'react'
import { CreateConnectorFn } from 'wagmi';
import { coinbaseWallet, walletConnect, metaMask } from '@wagmi/connectors'
import { walletConnect as customWalletConnect } from '../lib/wallets/connectors/resolveConnectors/walletConnect';
import { browserInjected } from '../lib/wallets/connectors/browserInjected';
import { isMobile } from '../lib/isMobile';
import { WalletConnectWallet } from '@/Models/WalletConnectWallet';
import { WALLETCONNECT_PROJECT_ID } from '@/lib/wallets/walletConnect/config';
import { useWalletConnectConnectors } from '@/lib/wallets/walletConnect/context';
import { decorateForWagmi as decorateBaseForWagmi } from '@/lib/wallets/walletConnect/decorateForWagmi';
import {
    type WalletConnectWalletBase,
    WC_REGISTRY_MARKER,
    type RegistryAttachedConnector,
} from '@/lib/wallets/walletConnect/types';

type WalletConnectDecorated = RegistryAttachedConnector<WalletConnectWallet>

type ContextType = {
    connectors: CreateConnectorFn[],
    walletConnectConnectors: WalletConnectDecorated[],
    addWalletConnectWallet: (connector: WalletConnectWalletBase) => void,
    hiddenWalletConnectConnector: CreateConnectorFn,
    walletConnectWalletsLoaded: boolean,
    loadWalletConnectWallets: () => Promise<WalletConnectDecorated[]>
}

const EvmConnectorsContext = createContext<ContextType | null>(null);

export const featuredWalletsIds = [
    'metamask',
    'argent',
    'rainbow',
    'bitkeep',
    'okx-wallet',
]

const wltcnnct_inited = walletConnect({ projectId: WALLETCONNECT_PROJECT_ID, showQrModal: isMobile(), customStoragePrefix: 'walletConnect' })

// Hidden WalletConnect connector for dynamic wallets - not shown in the list
// Uses custom walletConnect with unique ID so we can identify it
export const HIDDEN_WALLETCONNECT_ID = 'hiddenWalletConnect'
const hiddenWalletConnectConnector = customWalletConnect({
    id: HIDDEN_WALLETCONNECT_ID,
    name: 'Hidden WalletConnect',
    rdns: '',
    type: 'other',
    mobile: { native: '', universal: '' },
    icon: '',
    projectId: WALLETCONNECT_PROJECT_ID,
    showQrModal: false,
})

// Create stable connector instances at module level to ensure wagmi can reconnect properly
const metaMaskConnector = metaMask({
    dappMetadata: {
        name: 'Layerswap',
        url: 'https://layerswap.io/app/',
        iconUrl: 'https://layerswap.io/app/symbol.png'
    }
})

const coinbaseWalletConnector = coinbaseWallet({
    appName: 'Layerswap',
    appLogoUrl: 'https://layerswap.io/app/symbol.png',
})

const browserInjectedConnector = browserInjected()

// Wagmi-specific decoration of a shared-registry wallet. The shared
// `decorateBaseForWagmi` returns the plain `WalletConnectWallet`; here we
// additionally attach WC_REGISTRY_MARKER so the connect flow can recover the
// raw base entry later (for deep-link building, pending metadata, etc.)
// without threading a parallel list through every caller.
const decorateForWagmi = (base: WalletConnectWalletBase): WalletConnectDecorated => {
    const decorated = decorateBaseForWagmi(base)
    return Object.assign(decorated, { [WC_REGISTRY_MARKER]: base }) as WalletConnectDecorated
}

export function EvmConnectorsProvider({ children }) {
    const { connectors: baseConnectors, loaded, load, addRecent } = useWalletConnectConnectors('eip155')

    const walletConnectConnectors: WalletConnectDecorated[] = useMemo(
        () => baseConnectors.map(decorateForWagmi),
        [baseConnectors]
    )

    const addWalletConnectWallet = useCallback(
        (base: WalletConnectWalletBase): void => addRecent(base),
        [addRecent]
    )

    const loadWalletConnectWallets = useCallback(async (): Promise<WalletConnectDecorated[]> => {
        const loadedBase = await load()
        return loadedBase.map(decorateForWagmi)
    }, [load])

    const defaultConnectors: CreateConnectorFn[] = useMemo(() => [
        metaMaskConnector,
        coinbaseWalletConnector,
        wltcnnct_inited,
        browserInjectedConnector,
        hiddenWalletConnectConnector // Hidden connector for dynamic wallets
    ], [])

    const value = useMemo<ContextType>(() => ({
        connectors: defaultConnectors,
        walletConnectConnectors,
        addWalletConnectWallet,
        hiddenWalletConnectConnector,
        walletConnectWalletsLoaded: loaded,
        loadWalletConnectWallets,
    }), [defaultConnectors, walletConnectConnectors, addWalletConnectWallet, loaded, loadWalletConnectWallets])

    return (
        <EvmConnectorsContext.Provider value={value}>
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

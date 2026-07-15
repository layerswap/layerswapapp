import { BigmiProvider, useConnect } from '@bigmi/react'
import { createConfig, bitget, ctrl, leather, metamask, okx, onekey, unisat, xverse } from '@bigmi/client'
import type { Connector, CreateConnectorFn } from '@bigmi/client'
import { http, bitcoin, createClient, defineChain, Chain, ChainId } from '@bigmi/core'
import { getWallets } from '@wallet-standard/app'
import { NetworkType, NetworkWithTokens } from '@/Models/Network'
import { useSettingsState } from '@/context/settings'
import { createContext, useContext, useEffect, useMemo, useState } from 'react'
import { InternalConnector } from '@/Models/WalletProvider'
import { walletStandardBitcoinConnector } from '@/lib/wallets/bitcoin/walletStandardBitcoinConnector'
import convertSvgComponentToBase64 from '@/components/utils/convertSvgComponentToBase64'
import TrustIcon from '@/components/icons/Wallets/Trust'

export const BitcoinProvider = ({ children }: { children: JSX.Element | JSX.Element[] }) => {
    const { networks } = useSettingsState()
    const network = networks.find(n => n.type === NetworkType.Bitcoin)
    const config = useMemo(() => createDefaultBigmiConfig(network), [network])

    return (
        <BigmiProvider config={config} reconnectOnMount={true}>
            <ConnectorsContext>
                {children}
            </ConnectorsContext>
        </BigmiProvider>
    )
}

const toInternalConnector = async (connector: Connector): Promise<InternalConnector> => {
    const provider = await connector.getProvider()
    const isInjected = !!provider
    const config = connectorsConfigs.find(c => c.id === connector.id)
    return {
        name: connector.name,
        id: connector.id,
        icon: connector.icon,
        type: isInjected ? 'injected' : 'other',
        installUrl: !isInjected ? config?.installLink : undefined,
        extensionNotFound: !isInjected,
        providerName: connector.name
    }
}

const ConnectorsContext = ({ children }: { children: JSX.Element | JSX.Element[] }) => {
    const { connectors } = useConnect()
    const [resolvedConnectors, setResolvedConnectors] = useState<InternalConnector[]>([])

    useEffect(() => {
        let cancelled = false

        const resolve = async () => {
            const next = await Promise.all(connectors.map(toInternalConnector))
            if (!cancelled) setResolvedConnectors(next)
        }

        void resolve()

        const wallets = getWallets()
        const offRegister = wallets.on('register', () => void resolve())
        const offUnregister = wallets.on('unregister', () => void resolve())

        return () => {
            cancelled = true
            offRegister()
            offUnregister()
        }
    }, [connectors])

    return (
        <BitcoinConnectorsContext.Provider value={{ connectors: resolvedConnectors }}>
            {children}
        </BitcoinConnectorsContext.Provider>
    )
}

const BitcoinConnectorsContext = createContext<{ connectors: InternalConnector[] } | null>(null);

export function useBitcoinConnectors() {
    const context = useContext(BitcoinConnectorsContext);
    if (!context) {
        throw new Error('useBitcoinConnectors must be used within a BitcoinConnectorsProvider');
    }
    return context;
}

const connectorsConfigs = [
    {
        id: "XverseProviders.BitcoinProvider",
        name: "Xverse",
        installLink: "https://www.xverse.app/download"
    },
    {
        id: "unisat",
        name: 'UniSat',
        installLink: "https://unisat.io/"
    },
    {
        id: "io.xdefi",
        name: 'Ctrl',
        installLink: "https://ctrl.xyz/download/"
    },
    {
        id: "com.okex.wallet.bitcoin",
        name: 'OKX Wallet',
        installLink: "https://web3.okx.com/"
    },
    {
        id: "bitget",
        name: 'Bitget',
        installLink: "https://web3.bitget.com/en/wallet-download"
    },
    {
        id: "so.onekey.app.wallet.bitcoin",
        name: 'OneKey',
        installLink: "https://onekey.so/download/"
    },
    {
        id: "LeatherProvider",
        name: 'Leather',
        installLink: "https://leather.io/"
    },
    {
        id: "io.metamask.bitcoin",
        name: 'MetaMask',
        installLink: "https://metamask.io/download/"
    },
    {
        id: "trust-bitcoin",
        name: 'Trust Wallet',
        installLink: "https://trustwallet.com/download"
    }
]

function createDefaultBigmiConfig(network?: NetworkWithTokens) {

    let chain: Chain
    if (network?.name.toLowerCase().includes('testnet')) {
        chain = bitcoinTestnet(network)
    } else {
        chain = bitcoin
    }

    const btcChainId = chain.id
    // Note: Phantom was removed because @bigmi/client dropped its Phantom connector in v0.9.
    const connectors: CreateConnectorFn[] = [
        xverse({ chainId: btcChainId }),
        unisat({ chainId: btcChainId }),
        ctrl({ chainId: btcChainId }),
        okx({ chainId: btcChainId }),
        bitget({ chainId: btcChainId }),
        leather({ chainId: btcChainId }),
        onekey({ chainId: btcChainId }),
        metamask({ chainId: btcChainId }),
    ]

    // Trust supports bitcoin:mainnet only
    if (!chain.testnet) {
        connectors.push(walletStandardBitcoinConnector({
            chainId: btcChainId,
            walletName: 'Trust Wallet',
            standardName: 'Trust',
            walletId: 'trust-bitcoin',
            icon: convertSvgComponentToBase64(TrustIcon),
        }))
    }

    const config = createConfig({
        chains: [chain],
        connectors,
        client({ chain }) {
            return createClient({ chain, transport: http() })
        },
    })

    return config
}

const bitcoinTestnet = (network: NetworkWithTokens) => defineChain({
    id: ChainId.BITCOIN_TESTNET,
    name: 'Bitcoin Testnet',
    nativeCurrency: { name: 'Bitcoin', symbol: 'BTC', decimals: 8 },
    rpcUrls: {
        default: {
            http: [network.node_url],
        },
    },
    testnet: true,
    blockExplorers: {
        default: {
            name: 'Mempool',
            url: 'https://mempool.space/testnet',
        },
    },
});
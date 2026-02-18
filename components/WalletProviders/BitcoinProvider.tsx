import { BigmiProvider, useConnect } from '@bigmi/react'
import { createConfig, ctrl, leather, okx, onekey, phantom, unisat, xverse } from '@bigmi/client'
import type { CreateConnectorFn } from '@bigmi/client'
import { http, bitcoin, createClient, defineChain, Chain } from '@bigmi/core'
import { NetworkType, NetworkWithTokens } from '../../Models/Network'
import { useSettingsState } from '../../context/settings'
import { createContext, useContext, useEffect, useState } from 'react'
import { InternalConnector } from '@/Models/WalletProvider'

export const BitcoinProvider = ({ children }: { children: JSX.Element | JSX.Element[] }) => {
    const { networks } = useSettingsState()
    const network = networks.find(n => n.type === NetworkType.Bitcoin)
    const config = createDefaultBigmiConfig(network)

    return (
        <BigmiProvider config={config} reconnectOnMount={true}>
            <ConnectorsContext>
                {children}
            </ConnectorsContext>
        </BigmiProvider>
    )
}

const ConnectorsContext = ({ children }: { children: JSX.Element | JSX.Element[] }) => {
    const { connectors } = useConnect()
    const [resolvedConnectors, setResolvedConnectors] = useState<InternalConnector[]>([])

    useEffect(() => {
        (async () => {
            const resolvedConnectors: InternalConnector[] = await Promise.all(connectors.map(async (connector) => {
                const provider = await connector.getProvider()
                const isInjected = !!provider
                const installLink = !isInjected ? connectorsConfigs.find(c => c.id === connector.id)?.installLink : undefined
                const internalConnector: InternalConnector = {
                    name: connector.name,
                    id: connector.id,
                    icon: connector.icon,
                    type: isInjected ? 'injected' : 'other',
                    installUrl: installLink,
                    extensionNotFound: !isInjected,
                    providerName: connector.name
                }
                return internalConnector
            }))
            setResolvedConnectors(resolvedConnectors)
        })()
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
        id: "app.phantom.bitcoin",
        name: 'Phantom',
        installLink: "https://phantom.com/download"
    },
    {
        id: "unisat",
        name: 'UniSat',
        installLink: "https://unisat.io/"
    },
    {
        id: "io.xdefi.bitcoin",
        name: 'Ctrl',
        installLink: "https://ctrl.xyz/download/"
    },
    {
        id: "com.okex.wallet.bitcoin",
        name: 'OKX Wallet',
        installLink: "https://web3.okx.com/"
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
    const connectors: CreateConnectorFn[] = [
        phantom({ chainId: btcChainId }),
        xverse({ chainId: btcChainId }),
        unisat({ chainId: btcChainId }),
        // ctrl({ chainId: btcChainId }),
        // okx({ chainId: btcChainId }),
        leather({ chainId: btcChainId }),
        onekey({ chainId: btcChainId }),
    ]

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
    id: 20000000000002,
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
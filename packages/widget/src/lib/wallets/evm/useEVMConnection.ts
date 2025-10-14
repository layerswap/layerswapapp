import { useConfig, useConnect, useConnectors, useDisconnect, useSwitchAccount, Connector } from "wagmi"
import { NetworkType, NetworkWithTokens } from "@/Models/Network"
import { useSettingsState } from "@/context/settings"
import KnownInternalNames from "../../knownIds"
import { resolveWalletConnectorIcon, resolveWalletConnectorIndex } from "../utils/resolveWalletIcon"
import { evmConnectorNameResolver } from "./utils/KnownEVMConnectors"
import { useCallback, useEffect, useMemo, useRef } from "react"
import { CreateConnectorFn, getAccount, getConnections, sendTransaction } from '@wagmi/core'
import { isMobile } from "../../isMobile"
import convertSvgComponentToBase64 from "@/components/utils/convertSvgComponentToBase64"
import { LSConnector } from "./connectors/types"
import { explicitInjectedProviderDetected } from "./connectors/explicitInjectedProviderDetected"
import { InternalConnector, Wallet, WalletConnectionProvider } from "@/types/wallet"
import { useConnectModal } from "@/components/Wallet/WalletModal"
import sleep from "../utils/sleep"
import { useEvmConnectors } from "@/lib/wallets/evm/EVMProvider/evmConnectorsContext"
import { useActiveEvmAccount } from "@/lib/wallets/evm/EVMProvider/ActiveEvmAccount"
import { transactionBuilder } from "./services/transferService/transactionBuilder"
import { LoopringMultiStepHandler, ZkSyncMultiStepHandler } from "./components"
import { BaseError } from "viem"
import resolveError from "./utils/resolveError"
import { TransactionMessageType } from "@/components/Pages/Swap/Withdraw/messages/TransactionMessages"

const ethereumNames = [KnownInternalNames.Networks.EthereumMainnet, KnownInternalNames.Networks.EthereumSepolia]
const immutableZKEvm = [KnownInternalNames.Networks.ImmutableZkEVM]

export default function useEVMConnection(): WalletConnectionProvider {
    const name = 'EVM'
    const id = 'evm'
    const { networks } = useSettingsState()

    const asSourceSupportedNetworks = useMemo(() => [
        ...networks.filter(network => network.type === NetworkType.EVM).map(l => l.name),
        KnownInternalNames.Networks.ZksyncMainnet,
        KnownInternalNames.Networks.LoopringGoerli,
        KnownInternalNames.Networks.LoopringMainnet,
        KnownInternalNames.Networks.LoopringSepolia
    ], [networks])

    const withdrawalSupportedNetworks = useMemo(() => [
        ...asSourceSupportedNetworks,
    ], [asSourceSupportedNetworks])

    const autofillSupportedNetworks = useMemo(() => [
        ...asSourceSupportedNetworks,
        KnownInternalNames.Networks.ImmutableXMainnet,
        KnownInternalNames.Networks.ImmutableXSepolia,
        KnownInternalNames.Networks.BrineMainnet,
        KnownInternalNames.Networks.HyperliquidMainnet,
        KnownInternalNames.Networks.HyperliquidTestnet,
    ], [asSourceSupportedNetworks])

    const { disconnectAsync } = useDisconnect()
    const { switchAccountAsync } = useSwitchAccount()
    const { activeConnection, setActiveAddress } = useActiveEvmAccount()
    const allConnectors = useConnectors()
    const config = useConfig()
    const { connectAsync } = useConnect();

    const pendingResolve = useRef<((c: InternalConnector & LSConnector) => void) | undefined>()
    const pendingId = useRef<string>()

    const { setSelectedConnector } = useConnectModal()
    const { walletConnectConnectors, addWalletConnectWallet } = useEvmConnectors()

    const disconnectWallet = useCallback(async (connectorName: string) => {

        try {
            const connections = getConnections(config)
            const connector = connections.find(c => c.connector.name.toLowerCase() === connectorName.toLowerCase())?.connector
            await disconnectAsync({
                connector: connector
            })
        }
        catch (e) {
            console.log(e)
        }
    }, [config, disconnectAsync])

    const disconnectWallets = useCallback(() => {
        try {
            const connections = getConnections(config)
            connections.forEach(async (connection) => {
                disconnectWallet(connection.connector.name)
            })
        }
        catch (e) {
            console.log(e)
        }
    }, [config, disconnectWallet])

    const availableFeaturedWalletsForConnect: InternalConnector[] = useMemo(() => {
        const activeBrowserWallet = explicitInjectedProviderDetected() && allConnectors.filter(c => c.id !== "com.immutable.passport" && c.type === "injected").length === 1
        const filterConnectors = wallet => ((wallet.id === "injected" ? activeBrowserWallet : true))

        return dedupePreferInjected(allConnectors.filter(filterConnectors))
            .map(w => {
                const isWalletConnectSupported = walletConnectConnectors.some(w2 => w2.name.toLowerCase().includes(w.name.toLowerCase()) && (w2.mobile.universal || w2.mobile.native || w2?.desktop?.native || w2?.desktop?.universal)) || w.name === "WalletConnect"
                return {
                    ...w,
                    order: resolveWalletConnectorIndex(w.id),
                    type: (w.type == 'injected' && w.id !== 'com.immutable.passport') ? w.type : "other",
                    isMobileSupported: isWalletConnectSupported
                }
            })
    }, [allConnectors, walletConnectConnectors])

    const connectWallet = useCallback(async (props: { connector: InternalConnector }) => {
        try {
            const internalConnector = props?.connector;
            if (!internalConnector) return;
            let connector = availableFeaturedWalletsForConnect.find(w => w.id === internalConnector.id) as InternalConnector & LSConnector
            if (!connector) {
                const walletConnectConnector = walletConnectConnectors.find(w => w.id === internalConnector.id)
                if (!walletConnectConnector) throw new Error("Connector not found")
                await addWalletConnectWallet(walletConnectConnector)

                connector = await new Promise<InternalConnector & LSConnector>((res, rej) => {
                    pendingId.current = walletConnectConnector.id
                    pendingResolve.current = res
                    setTimeout(() => {
                        if (pendingResolve.current) {
                            pendingResolve.current = undefined
                            rej(new Error("Timed out waiting for new connector"))
                        }
                    }, 4000)
                })

            }
            const Icon = connector.icon || resolveWalletConnectorIcon({ connector: evmConnectorNameResolver(connector) })
            const base64Icon = typeof Icon == 'string' ? Icon : convertSvgComponentToBase64(Icon)
            setSelectedConnector({ ...connector, icon: base64Icon })
            if (connector.id !== "coinbaseWalletSDK") {
                await connector.disconnect()
                await disconnectAsync({ connector })
            }

            if (isMobile()) {
                if (connector.id !== "walletConnect") {
                    getWalletConnectUri(connector, connector?.resolveURI, (uri: string) => {
                        window.location.href = uri;
                    })
                }
            }
            else if (connector.type !== 'injected' && connector.isMobileSupported && connector.id !== "coinbaseWalletSDK") {
                setSelectedConnector({ ...connector, qr: { state: 'loading', value: undefined } })
                getWalletConnectUri(connector, connector?.resolveURI, (uri: string) => {
                    setSelectedConnector({ ...connector, icon: base64Icon, qr: { state: 'fetched', value: uri } })
                })
            }

            await connectAsync({ connector });

            const activeAccount = await attemptGetAccount(config)
            const connections = getConnections(config)
            let connection = connections.find(c => c.connector.id === connector?.id)

            if (!connection) {
                const address = await connector.getAccounts()
                const chainId = await connector.getChainId()
                connection = {
                    accounts: address as readonly [`0x${string}`, ...`0x${string}`[]],
                    chainId: Number(chainId),
                    connector
                }
            }

            const wallet = ResolveWallet({
                activeConnection: (activeAccount.connector && activeAccount.address) ? {
                    id: activeAccount.connector.id,
                    address: activeAccount.address
                } : undefined,
                connection,
                discconnect: disconnectWallet,
                networks,
                supportedNetworks: {
                    asSource: asSourceSupportedNetworks,
                    autofill: autofillSupportedNetworks,
                    withdrawal: withdrawalSupportedNetworks
                },
                providerName: name
            })

            return wallet

        } catch (e) {
            //TODO: handle error like in transfer
            const error = e
            if (error.name == 'ConnectorAlreadyConnectedError') {
                throw new Error("Wallet is already connected");
            } else {
                throw new Error(e.message || e);
            }
        }
    }, [availableFeaturedWalletsForConnect, disconnectAsync, networks, asSourceSupportedNetworks, autofillSupportedNetworks, withdrawalSupportedNetworks, name, config])

    const connectedWalletsKey = [...config.state.connections.keys()].join('-')

    const resolvedConnectors: Wallet[] = useMemo(() => {
        const connections = getConnections(config)
        return connections.map((connection): Wallet | undefined => {
            const wallet = ResolveWallet({
                activeConnection: (activeConnection?.id && activeConnection.address) ? {
                    id: activeConnection.id,
                    address: activeConnection.address
                } : undefined,
                connection,
                discconnect: disconnectWallet,
                networks,
                supportedNetworks: {
                    asSource: asSourceSupportedNetworks,
                    autofill: autofillSupportedNetworks,
                    withdrawal: withdrawalSupportedNetworks
                },
                providerName: name
            })

            return wallet
        }).filter(w => w !== undefined)
    }, [activeConnection, config, connectedWalletsKey])

    const switchAccount = useCallback(async (wallet: Wallet, address: string) => {
        const connector = getConnections(config).find(c => c.connector.name === wallet.id)?.connector
        if (!connector)
            throw new Error("Connector not found")
        const { accounts } = await switchAccountAsync({ connector })
        const account = accounts.find(a => a.toLowerCase() === address.toLowerCase())
        if (!account)
            throw new Error("Account not found")
        setActiveAddress(account)
    }, [config, switchAccountAsync])

    const switchChain = async (wallet: Wallet, chainId: string | number) => {
        const connector = getConnections(config).find(c => c.connector.name === wallet.id)?.connector
        if (!connector)
            throw new Error("Connector not found")

        if (connector?.switchChain) {
            await connector.switchChain({ chainId: Number(chainId) });
        } else {
            throw new Error("Switch chain method is not available on the connector");
        }
    }

    const transfer: WalletConnectionProvider['transfer'] = async (params) => {
        const { selectedWallet } = params

        try {
            const tx = await transactionBuilder(params)

            if (isMobile() && selectedWallet?.metadata?.deepLink) {
                window.location.href = selectedWallet.metadata?.deepLink
                await new Promise(resolve => setTimeout(resolve, 100))
            }
            const hash = await sendTransaction(config, tx)

            if (hash) {
                return hash
            }
        } catch (error) {
            const transactionResolvedError = resolveError(error as BaseError)
            const e = new Error()
            e.message = error.message
            if (transactionResolvedError && transactionResolvedError === "insufficient_funds") {
                e.name = TransactionMessageType.TransactionRejected
                throw e
            }
            else if (transactionResolvedError && transactionResolvedError === "transaction_rejected") {
                e.name = TransactionMessageType.TransactionRejected
                throw e
            }
            else {
                e.name = TransactionMessageType.UexpectedErrorMessage
                throw e
            }
        }
    }

    const activeWallet = useMemo(() => resolvedConnectors.find(w => w.isActive), [resolvedConnectors])
    const providerIcon = useMemo(() => networks.find(n => ethereumNames.some(name => name === n.name))?.logo, [networks])

    useEffect(() => {
        if (!pendingResolve.current) return
        const found = availableFeaturedWalletsForConnect.find(c => c.id === pendingId.current)
        if (found) {
            pendingResolve.current(found as any)
            pendingResolve.current = undefined
        }
    }, [availableFeaturedWalletsForConnect, pendingId.current, pendingResolve.current])

    const provider: WalletConnectionProvider = useMemo(() => {
        return {
            connectWallet,
            disconnectWallets,
            switchAccount,
            switchChain,
            isNotAvailableCondition: isNotAvailable,

            transfer,

            connectedWallets: resolvedConnectors,
            activeWallet,
            autofillSupportedNetworks,
            withdrawalSupportedNetworks,
            asSourceSupportedNetworks,
            availableWalletsForConnect: availableFeaturedWalletsForConnect,
            availableHiddenWalletsForConnect: walletConnectConnectors,
            name,
            id,
            providerIcon,

            multiStepHandlers: [
                {
                    component: LoopringMultiStepHandler,
                    supportedNetworks: [KnownInternalNames.Networks.LoopringMainnet, KnownInternalNames.Networks.LoopringGoerli, KnownInternalNames.Networks.LoopringSepolia]
                },
                {
                    component: ZkSyncMultiStepHandler,
                    supportedNetworks: [KnownInternalNames.Networks.ZksyncMainnet]
                }
            ]
        }
    }, [connectWallet, disconnectWallets, switchAccount, resolvedConnectors, availableFeaturedWalletsForConnect, walletConnectConnectors, autofillSupportedNetworks, withdrawalSupportedNetworks, asSourceSupportedNetworks, name, id, networks]);

    return provider
}


const getWalletConnectUri = async (
    connector: Connector,
    uriConverter: (uri: string) => string = (uri) => uri,
    useCallback: (uri: string) => void,
): Promise<void> => {
    const provider = await connector.getProvider();
    if (connector.id === 'coinbase') {
        // @ts-expect-error
        return provider.qrUrl;
    }
    return new Promise<void>((resolve) => {
        return provider?.['once'] && provider['once']('display_uri', (uri) => {
            resolve(useCallback(uriConverter(uri)));
        })
    }
    );
};

const isNotAvailable = (connector: string | undefined, network: string | undefined) => {
    if (!network) return false
    if (!connector) return true
    return resolveSupportedNetworks([network], connector).length === 0
}

type ResolveWalletProps = {
    connection: {
        accounts: readonly [`0x${string}`, ...`0x${string}`[]];
        chainId: number;
        connector: Connector;
    } | undefined,
    networks: NetworkWithTokens[],
    activeConnection: {
        id: string,
        address: string
    } | undefined,
    discconnect: (connectorName: string) => Promise<void>,
    supportedNetworks: {
        asSource: string[],
        autofill: string[],
        withdrawal: string[]
    },
    providerName: string
}

const ResolveWallet = (props: ResolveWalletProps): Wallet | undefined => {
    const { activeConnection, connection, networks, discconnect, supportedNetworks, providerName } = props
    const walletIsActive = activeConnection?.id === connection?.connector.id

    const addresses = connection?.accounts as (string[] | undefined);
    const activeAddress = activeConnection?.address
    const connector = connection?.connector
    if (!connector)
        return undefined
    const address = walletIsActive ? activeAddress : addresses?.[0]
    if (!address) return undefined

    const walletname = `${connector?.name} ${connector.id === "com.immutable.passport" ? "" : " - EVM"}`

    const wallet: Wallet = {
        chainId: connection.chainId,
        id: connector.name,
        internalId: connector.id,
        isActive: walletIsActive,
        address,
        addresses: addresses || [address],
        displayName: walletname,
        providerName,
        icon: resolveWalletConnectorIcon({ connector: evmConnectorNameResolver(connector), address, iconUrl: connector.icon }),
        disconnect: () => discconnect(connector.name),
        asSourceSupportedNetworks: resolveSupportedNetworks(supportedNetworks.asSource, connector.id),
        autofillSupportedNetworks: resolveSupportedNetworks(supportedNetworks.autofill, connector.id),
        withdrawalSupportedNetworks: resolveSupportedNetworks(supportedNetworks.withdrawal, connector.id),
        networkIcon: networks.find(n => connector?.id === "com.immutable.passport" ? immutableZKEvm.some(name => name === n.name) : ethereumNames.some(name => name === n.name))?.logo,
        metadata: {
            deepLink: (connector as LSConnector).deepLink
        }
    }

    return wallet
}

const resolveSupportedNetworks = (supportedNetworks: string[], connectorId: string) => {

    const specificNetworksConnectors = [
        {
            id: "com.immutable.passport",
            supportedNetworks: [
                KnownInternalNames.Networks.ImmutableXMainnet,
                KnownInternalNames.Networks.ImmutableXGoerli,
                KnownInternalNames.Networks.ImmutableXSepolia,
                KnownInternalNames.Networks.ImmutableZkEVM
            ]
        },
        {
            id: "com.roninchain.wallet",
            supportedNetworks: [
                KnownInternalNames.Networks.RoninMainnet,
                KnownInternalNames.Networks.EthereumMainnet,
                KnownInternalNames.Networks.PolygonMainnet,
                KnownInternalNames.Networks.BaseMainnet,
                KnownInternalNames.Networks.BNBChainMainnet,
                KnownInternalNames.Networks.ArbitrumMainnet
            ]
        },
        {
            id: "app.phantom",
            supportedNetworks: [
                KnownInternalNames.Networks.EthereumMainnet,
                KnownInternalNames.Networks.BaseMainnet,
                KnownInternalNames.Networks.PolygonMainnet,
            ]
        }
    ]

    const specificNetworks = specificNetworksConnectors.find(c => c.id === connectorId)

    if (specificNetworks) {
        const values = specificNetworks.supportedNetworks.filter(n => supportedNetworks.some(name => name === n))
        return values
    }

    return supportedNetworks

}

async function attemptGetAccount(config, maxAttempts = 5) {
    for (let attempt = 0; attempt < maxAttempts; attempt++) {
        const account = getAccount(config);

        if (account.address) {
            return account;
        }
        await sleep(500);
    }

    return getAccount(config);
}
function dedupePreferInjected(arr: Connector<CreateConnectorFn>[]) {
    // Helper to strip off any prefix up to the last dot
    const getBaseId = (id: string) => id.includes('.') ? id.split('.').pop()! : id;

    // Group items by normalized base‐id
    const groups = arr.reduce<Record<string, Connector<CreateConnectorFn>[]>>((acc, obj) => {
        const key = getBaseId(obj.name);
        (acc[key] = acc[key] || []).push(obj);
        return acc;
    }, {});

    // Within each group, if any are injected prefer them, otherwise keep all
    return Object.values(groups).flatMap(group => {
        const injected = group.filter(o => o.type === 'injected');
        return injected.length > 0 ? injected : group;
    });
}

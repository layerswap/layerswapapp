import { useAccount, useConfig, useConnect, useConnectors, useDisconnect, useSwitchAccount, Connector } from "wagmi"
import { NetworkType } from "../../../Models/Network"
import { useSettingsState } from "../../../context/settings"
import { WalletProvider } from "../../../hooks/useWallet"
import KnownInternalNames from "../../knownIds"
import { resolveWalletConnectorIcon, resolveWalletConnectorIndex } from "../utils/resolveWalletIcon"
import { evmConnectorNameResolver } from "./KnownEVMConnectors"
import { useCallback, useMemo } from "react"
import { Wallet } from "../../../stores/walletStore"
import { useWalletModalState } from "../../../stores/walletModalStateStore"
import { getConnections } from '@wagmi/core'
import toast from "react-hot-toast"
import { isMobile } from "../../isMobile"
import { mainnet } from "wagmi/chains"

export default function useEVM(): WalletProvider {
    const name = 'EVM'
    const id = 'evm'
    const { networks } = useSettingsState()

    const asSourceSupportedNetworks = [
        ...networks.filter(network => network.type === NetworkType.EVM).map(l => l.name),
        KnownInternalNames.Networks.ZksyncMainnet,
        KnownInternalNames.Networks.LoopringGoerli,
        KnownInternalNames.Networks.LoopringMainnet,
        KnownInternalNames.Networks.LoopringSepolia
    ]

    const withdrawalSupportedNetworks = [
        ...asSourceSupportedNetworks,
        KnownInternalNames.Networks.ParadexMainnet,
        KnownInternalNames.Networks.ParadexTestnet,
    ]

    const autofillSupportedNetworks = [
        ...asSourceSupportedNetworks,
        KnownInternalNames.Networks.ImmutableXMainnet,
        KnownInternalNames.Networks.ImmutableXGoerli,
        KnownInternalNames.Networks.BrineMainnet,
    ]

    const setWalletModalIsOpen = useWalletModalState((state) => state.setOpen)
    const setSelectedProvider = useWalletModalState((state) => state.setSelectedProvider)
    const setActiveAccountAddress = useWalletModalState((state) => state.setActiveAccountAddress)
    const activeAccountAddress = useWalletModalState((state) => state.activeAccountAddress)

    const { disconnectAsync } = useDisconnect()
    const { connectors: connectedWallets, switchAccountAsync } = useSwitchAccount()
    const activeAccount = useAccount()
    const allConnectors = useConnectors()
    const config = useConfig()
    const { connectAsync } = useConnect();

    const connectWallet = () => {
        try {
            setSelectedProvider(provider)
            setWalletModalIsOpen(true)
        }
        catch (e) {
            console.log(e)
        }
    }

    const connectConnector = async ({ connector }) => {
        try {
            setSelectedProvider({ ...provider, connector: { name: connector.name } })
            await connector.disconnect()
            if (connector.id !== 'walletConnect') {
                if (isMobile()) {
                    getWalletConnectUri(connector, connector?.resolveURI, (uri: string) => {
                        window.location.href = uri;
                    })
                }
                else {
                    getWalletConnectUri(connector, connector?.resolveURI, (uri: string) => {
                        setSelectedProvider({ ...provider, connector: { name: connector.name, qr: uri } })
                    })
                }
            }

            await connectAsync({
                chainId: mainnet.id,
                connector: connector,
            });


        } catch (e) {
            //TODO: handle error like in transfer
            toast.error('Error connecting wallet')
            throw new Error(e)
        }
    }

    const resolvedConnectors: Wallet[] = useMemo(() => {
        const connections = getConnections(config)

        return connectedWallets.map(w => {

            //TODO: handle Ronin wallet case
            // let roninWalletNetworks = [
            //     KnownInternalNames.Networks.RoninMainnet,
            //     KnownInternalNames.Networks.EthereumMainnet,
            //     KnownInternalNames.Networks.PolygonMainnet,
            //     KnownInternalNames.Networks.BNBChainMainnet,
            //     KnownInternalNames.Networks.ArbitrumMainnet];

            // if (connector == "com.roninchain.wallet" && network && !roninWalletNetworks.includes(network.name)) {
            //     return undefined;
            // }

            const connection = connections.find(c => c.connector.id === w.id)
            const accountIsActive = activeAccount?.connector?.id === w.id

            const addresses = connection?.accounts as (string[] | undefined);
            const activeAddress = activeAccount?.address

            const address = accountIsActive ? activeAddress : addresses?.[0]
            if (!address) return undefined

            return {
                isActive: accountIsActive,
                address,
                addresses: addresses || [address],
                connector: w.name,
                providerName: name,
                icon: resolveWalletConnectorIcon({ connector: evmConnectorNameResolver(w), address, iconUrl: w.icon }),
                connect: connectWallet,
                disconnect: () => disconnectWallet(w.name)
            }
        }).filter(w => w !== undefined) as Wallet[]
    }, [activeAccount, connectedWallets, config])


    const disconnectWallet = async (connectorName: string) => {

        try {
            const connector = connectedWallets.find(w => w.name.toLowerCase() === connectorName.toLowerCase())
            // connector && await connector.disconnect()
            await disconnectAsync({
                connector: connector
            })
        }
        catch (e) {
            console.log(e)
        }
    }

    const disconnectWallets = () => {
        try {
            connectedWallets.forEach(async (connector) => {
                disconnectWallet(connector.name)
            })
        }
        catch (e) {
            console.log(e)
        }
    }

    const switchAccount = useCallback(async (wallet: Wallet, address: string) => {
        const connector = allConnectors.find(c => c.name === wallet.connector)
        if (!connector)
            throw new Error("Connector not found")
        const { accounts } = await switchAccountAsync({ connector })
        const account = accounts.find(a => a.toLowerCase() === address.toLowerCase())
        if (!account)
            throw new Error("Account not found")
        setActiveAccountAddress(account)
    }, [])

    {/* //TODO: refactor ordering */ }
    allConnectors.forEach(w => { w["order"] = resolveWalletConnectorIndex(w.id) })

    const provider = {
        connectWallet,
        connectConnector,
        disconnectWallets,
        switchAccount,
        connectedWallets: resolvedConnectors,
        activeWallet: resolvedConnectors.find(w => w.isActive),
        activeAccountAddress: activeAccountAddress || activeAccount?.address,
        autofillSupportedNetworks,
        withdrawalSupportedNetworks,
        asSourceSupportedNetworks,
        availableWalletsForConnect: allConnectors as any,
        name,
        id,
    }

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
            const converted = uriConverter(uri);
            resolve(useCallback(uriConverter(uri)));
        })
    }
    );
};
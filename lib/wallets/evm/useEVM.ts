import { Connector, useAccount, useConfig, useConnectors, useDisconnect, useSwitchAccount } from "wagmi"
import { Network, NetworkType } from "../../../Models/Network"
import { useSettingsState } from "../../../context/settings"
import { WalletProvider, WalletPurpose } from "../../../hooks/useWallet"
import KnownInternalNames from "../../knownIds"
import { resolveWalletConnectorIcon, resolveWalletConnectorIndex } from "../utils/resolveWalletIcon"
import { evmConnectorNameResolver } from "./KnownEVMConnectors"
import { useCallback, useMemo } from "react"
import { Wallet } from "../../../stores/walletStore"
import { useWalletModalState } from "../../../stores/walletModalStateStore"
import { getConnections } from '@wagmi/core'

type Props = {
    network: Network | undefined,
    purpose: WalletPurpose | undefined
}

export default function useEVM({ network, purpose }: Props): WalletProvider {
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
    const { connectors: activeConnectors, switchAccountAsync } = useSwitchAccount()
    const activeAccount = useAccount()
    const allConnectors = useConnectors()
    const config = useConfig()
    console.log(allConnectors)
    const connectWallet = () => {
        try {
            setSelectedProvider(provider)
            setWalletModalIsOpen(true)
        }
        catch (e) {
            console.log(e)
        }
    }

    const connectedWallets: Wallet[] = useMemo(() => {
        const connections = getConnections(config)

        return activeConnectors.map(w => {

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
                disconnect: () => disconnectWallet(w.name),
                isNotAvailable: isNotAvailable(w, network)
            }
        }).filter(w => w !== undefined) as Wallet[]
    }, [activeAccount, activeConnectors, config])


    const disconnectWallet = async (connectorName: string) => {

        try {
            const connector = activeConnectors.find(w => w.name.toLowerCase() === connectorName.toLowerCase())
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
            activeConnectors.forEach(async (connector) => {
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
    const availableWalletsForConnect = allConnectors.filter(w => !isNotAvailable(w, network)).map(w => ({ ...w, order: resolveWalletConnectorIndex(w.id) }))

    const provider = {
        connectWallet,
        disconnectWallets,
        switchAccount,
        connectedWallets,
        activeWallet: connectedWallets.find(w => w.isActive),
        activeAccountAddress: activeAccountAddress || activeAccount?.address,
        autofillSupportedNetworks,
        withdrawalSupportedNetworks,
        asSourceSupportedNetworks,
        availableWalletsForConnect: availableWalletsForConnect as any,
        name,
        id,
    }

    return provider
}
const isNotAvailable = (connector: Connector, network: Network | undefined) => {
    if (!network) return false
    return connector.id === "com.immutable.passport" && !network.name.toLowerCase().startsWith("immutable")
}
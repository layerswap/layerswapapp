import { useConnectModal } from "@rainbow-me/rainbowkit"
import { Connector, useAccount, useConnectors, useDisconnect, useSwitchAccount } from "wagmi"
import { NetworkType } from "../../../Models/Network"
import { useSettingsState } from "../../../context/settings"
import { WalletProvider } from "../../../hooks/useWallet"
import KnownInternalNames from "../../knownIds"
import resolveWalletConnectorIcon from "../utils/resolveWalletIcon"
import { evmConnectorNameResolver } from "./KnownEVMConnectors"
import { useEffect, useState } from "react"
import { useWalletModal } from "../../../context/walletModalContext"


export default function useEVM(): WalletProvider & { availableWalletsforConnect: Connector[] } {
    const { networks } = useSettingsState()
    const [shouldConnect, setShouldConnect] = useState(false)
    const { disconnectAsync } = useDisconnect()

    const asSourceSupportedNetworks = [
        ...networks.filter(network => network.type === NetworkType.EVM && network.name !== KnownInternalNames.Networks.RoninMainnet).map(l => l.name),
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

    const name = 'evm'

    const account = useAccount()

    const { openConnectModal } = useConnectModal()
    const { setWalletModalIsOpen } = useWalletModal()

    useEffect(() => {
        if (shouldConnect) {
            connectWallet()
            setShouldConnect(false)
        }
    }, [shouldConnect])

    const { connectors, switchAccount } = useSwitchAccount()

    const uniqueConnectors = connectors.filter((value, index, array) => array.findIndex(a => a.id === value.id) === index)

    const { connectors: connectedWallets } = useSwitchAccount()
    const allConnectors = useConnectors()

    const availableWalletsforConnect = resolveAvailableWallets(allConnectors, connectedWallets)

    const getWallet = () => {
        if (account && account.address && account.connector) {
            const connector = account.connector.id

            return {
                address: account.address,
                connector: account.connector.name || connector.charAt(0).toUpperCase() + connector.slice(1),
                providerName: name,
                icon: resolveWalletConnectorIcon({ connector: evmConnectorNameResolver(account.connector), address: account.address })
            }
        }
    }

    const connectWallet = () => {
        try {
            if (openConnectModal) {
                return openConnectModal()
            }
            setWalletModalIsOpen(true)
        }
        catch (e) {
            console.log(e)
        }
    }

    const disconnectWallet = async () => {
        try {
            account.connector && await account.connector.disconnect()
            await disconnectAsync()
        }
        catch (e) {
            console.log(e)
        }
    }

    const reconnectWallet = async () => {
        try {
            account.connector && await account.connector.disconnect()
            await disconnectAsync()
            setShouldConnect(true)
        }
        catch (e) {
            console.log(e)
        }
    }


    return {
        getConnectedWallet: getWallet,
        connectWallet,
        availableWalletsforConnect,
        disconnectWallet,
        reconnectWallet,
        autofillSupportedNetworks,
        withdrawalSupportedNetworks,
        asSourceSupportedNetworks,
        name
    }
}


const resolveAvailableWallets = (all_connectors: readonly Connector[], connected: readonly Connector[]) => {
    console.log("connected", connected)
    console.log("all_connectors", all_connectors)
    const available_connectors = all_connectors.filter((connector, index, array) => {
        return connector?.['rkDetails']
            && array.findIndex(a => a?.['rkDetails']?.['id'] === connector?.['rkDetails']?.['id']) === index
            && !connected.some((connected_connector) => {
                return connected_connector?.['rkDetails']?.['id'] === connector?.['rkDetails']?.['id']
            })
    })
    return available_connectors

}
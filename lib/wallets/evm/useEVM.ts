import { useConnectModal } from "@rainbow-me/rainbowkit"
import { Connector, useAccount, useConnectors, useDisconnect, useSwitchAccount } from "wagmi"
import { NetworkType } from "../../../Models/Network"
import { useSettingsState } from "../../../context/settings"
import { WalletProvider } from "../../../hooks/useWallet"
import KnownInternalNames from "../../knownIds"
import resolveWalletConnectorIcon from "../utils/resolveWalletIcon"
import { evmConnectorNameResolver } from "./KnownEVMConnectors"
import { useCallback, useEffect, useState } from "react"
import { useWalletModal } from "../../../context/walletModalContext"
import { Wallet } from "../../../stores/walletStore"

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

    const { openConnectModal } = useConnectModal()
    const { setWalletModalIsOpen } = useWalletModal()

    useEffect(() => {
        if (shouldConnect) {
            connectWallet()
            setShouldConnect(false)
        }
    }, [shouldConnect])


    const { connectors: connectedWallets, switchAccount } = useSwitchAccount()

    const uniqueConnectors = connectedWallets.filter((value, index, array) => array.findIndex(a => a.name.toLowerCase() === value.name.toLowerCase()) === index)
    const allConnectors = useConnectors()

    const availableWalletsforConnect = resolveAvailableWallets(allConnectors, connectedWallets)

    const getConnectedWallets = useCallback(() => {

        let wallets: Wallet[] = []

        if (uniqueConnectors) {

            for (let i = 0; i < uniqueConnectors.length; i++) {
                const account = uniqueConnectors[i];

                // const res = account.getAccounts && account.getAccounts()
                // const address = res && res[0]

                wallets.push({
                    address: 'testAddress',
                    connector: account.name,
                    providerName: name,
                    icon: resolveWalletConnectorIcon({ connector: evmConnectorNameResolver(account), address: 'testAddress' })
                })
            }
        }

        return wallets

    }, [uniqueConnectors])

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

    const disconnectWallet = async (connectorName: string) => {

        try {
            const connector = connectedWallets.find(w => w.name.toLowerCase() === connectorName.toLowerCase())
            connector && await connector.disconnect()
            await disconnectAsync({
                connector: connector
            })
        }
        catch (e) {
            console.log(e)
        }
    }

    const reconnectWallet = async () => {
        try {
            // account.connector && await account.connector.disconnect()
            await disconnectAsync()
            setShouldConnect(true)
        }
        catch (e) {
            console.log(e)
        }
    }


    return {
        getConnectedWallets,
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
    // console.log("connected", connected)
    // console.log("all_connectors", all_connectors)
    const available_connectors = all_connectors.filter((connector, index, array) => {
        return connector?.['rkDetails']
            && array.findIndex(a => a?.['rkDetails']?.['id'] === connector?.['rkDetails']?.['id']) === index
            && !connected.some((connected_connector) => {
                return connected_connector?.['rkDetails']?.['id'] === connector?.['rkDetails']?.['id']
            })
    })
    return available_connectors

}
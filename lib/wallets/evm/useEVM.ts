import { useConnectModal } from "@rainbow-me/rainbowkit"
import { Connector, useAccount, useConnectors, useDisconnect, useSwitchAccount } from "wagmi"
import { NetworkType } from "../../../Models/Network"
import { useSettingsState } from "../../../context/settings"
import { NewWalletProvider } from "../../../hooks/useWallet"
import KnownInternalNames from "../../knownIds"
import resolveWalletConnectorIcon from "../utils/resolveWalletIcon"
import { evmConnectorNameResolver } from "./KnownEVMConnectors"
import { useCallback, useEffect, useState } from "react"
import { useWalletModal } from "../../../context/walletModalContext"
import { Wallet } from "../../../stores/walletStore"
import { useEVMAddressesStore } from "../../../stores/evmAddressesStore"

export default function useEVM(): NewWalletProvider & { availableWalletsforConnect: Connector[] } {
    const name = 'EVM'
    const id = 'evm'
    const { networks } = useSettingsState()

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

    const { openConnectModal } = useConnectModal()
    const { setWalletModalIsOpen } = useWalletModal()
    const { disconnectAsync } = useDisconnect()
    const { connectors: connectedWallets } = useSwitchAccount()
    const activeAccount = useAccount()
    const allConnectors = useConnectors()

    const uniqueConnectors = connectedWallets.filter((value, index, array) => array.findIndex(a => a.name.toLowerCase() === value.name.toLowerCase()) === index)

    const EVMAddresses = useEVMAddressesStore((state) => state.EVMAddresses)
    const setAddresses = useEVMAddressesStore((state) => state.setEVMAddresses)
    const [isLoading, setIsLoading] = useState(false)

    useEffect(() => {

        if (EVMAddresses) return

        setIsLoading(true)

        let addresses: { connectorName: string, addresses: string[] }[] = []

        uniqueConnectors.forEach(async (connector) => {
            const res = connector.getAccounts && await connector.getAccounts()
            addresses.push({ connectorName: connector.name, addresses: res as string[] || [] })
        })

        setAddresses(addresses)
        setIsLoading(false)
    }, [])

    const getConnectedWallets = useCallback(() => {

        let wallets: Wallet[] = []

        if (uniqueConnectors) {

            for (let i = 0; i < uniqueConnectors.length; i++) {

                const account = uniqueConnectors[i];
                const accountIsActive = activeAccount?.connector?.name === account.name

                const activeAddress = activeAccount?.address

                const addresses = EVMAddresses.find(w => w.connectorName === account.name)?.addresses

                let wallet: Wallet = {
                    isActive: accountIsActive,
                    address: accountIsActive ? activeAddress : addresses?.[0],
                    addresses: addresses,
                    connector: account.name,
                    providerName: name,
                    isLoading: isLoading,
                    icon: resolveWalletConnectorIcon({ connector: evmConnectorNameResolver(account), address: activeAddress || '' }),
                    connect: connectWallet,
                    disconnect: () => disconnectWallet(account.name)
                }

                wallets.push(wallet)
            }
        }

        return wallets

    }, [uniqueConnectors, activeAccount, EVMAddresses, isLoading])

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

    const reconnectWallet = async () => {
        try {
            // account.connector && await account.connector.disconnect()
            // await disconnectAsync()
        }
        catch (e) {
            console.log(e)
        }
    }

    const availableWalletsforConnect = resolveAvailableWallets(allConnectors, connectedWallets)
    const resolvedConnectedWallets = getConnectedWallets()

    return {
        connectWallet,
        disconnectWallets,
        reconnectWallet,
        connectedWallets: resolvedConnectedWallets,
        activeWallet: resolvedConnectedWallets.find(w => w.isActive),
        availableWalletsforConnect,
        autofillSupportedNetworks,
        withdrawalSupportedNetworks,
        asSourceSupportedNetworks,
        name,
        id
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
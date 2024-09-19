import { Connector, useAccount, useConnectors, useDisconnect, useSwitchAccount } from "wagmi"
import { NetworkType } from "../../../Models/Network"
import { useSettingsState } from "../../../context/settings"
import { WalletProvider } from "../../../hooks/useWallet"
import KnownInternalNames from "../../knownIds"
import resolveWalletConnectorIcon from "../utils/resolveWalletIcon"
import { evmConnectorNameResolver } from "./KnownEVMConnectors"
import { useCallback, useEffect, useRef, useState } from "react"
import { Wallet } from "../../../stores/walletStore"
import { EVMAddresses, useEVMAddressesStore } from "../../../stores/evmAddressesStore"
import { useWalletModalState } from "../../../stores/walletModalStateStore"
import { address } from "@ton/core"

export default function useEVM(): WalletProvider {
    const name = 'EVM'
    const id = 'evm'
    const { networks } = useSettingsState()
    console.log("rndrevm")
    useEffect(() => {
        console.log("hookrevm")
    }, [])
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

    const { disconnectAsync } = useDisconnect()
    const { connectors: connectedWallets } = useSwitchAccount()
    const activeAccount = useAccount()
    const allConnectors = useConnectors()

    const uniqueConnectors = connectedWallets.filter((value, index, array) => array.findIndex(a => a.name.toLowerCase() === value.name.toLowerCase()) === index)

    const EVMAddresses = useEVMAddressesStore((state) => state.EVMAddresses)
    const addEVMAddresses = useEVMAddressesStore((state) => state.addEVMAddresses)
    const [isLoading, setIsLoading] = useState(false)
    const [fetchAddresses, setFetchAddresses] = useState(false)
    const lastUniqueConnectors = useRef<Connector[] | null>(null)

    useEffect(() => {
        if (!fetchAddresses || isLoading || (uniqueConnectors && lastUniqueConnectors.current && uniqueConnectors.toString() === lastUniqueConnectors.current.toString())) return

        setIsLoading(true)

        uniqueConnectors.forEach(async connector => {
            if (connector.name.toLowerCase() === activeAccount?.connector?.name.toLowerCase()) {
                const item: EVMAddresses = { connectorName: connector.name, addresses: [...activeAccount?.addresses || []] }
                addEVMAddresses(item)
            } else {
                const res = connector.getAccounts && await connector.getAccounts()
                if (res && res.length > 0) {
                    const item = { connectorName: connector.name, addresses: res as string[] }
                    addEVMAddresses(item)
                }
            }

        })

        lastUniqueConnectors.current = uniqueConnectors

        setIsLoading(false)
        setFetchAddresses(false)
    }, [uniqueConnectors])

    const getConnectedWallets = useCallback(() => {

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


        let wallets: Wallet[] = []

        if (uniqueConnectors) {
            if (!fetchAddresses) setFetchAddresses(true)

            for (let i = 0; i < uniqueConnectors.length; i++) {

                const account = uniqueConnectors[i];
                const accountIsActive = activeAccount?.connector?.name === account.name

                const activeAddress = activeAccount?.address

                const addresses = EVMAddresses?.find(w => w.connectorName.toLowerCase() === account.name.toLowerCase())?.addresses
                if (!addresses) continue

                let wallet: Wallet = {
                    isActive: accountIsActive,
                    address: accountIsActive ? activeAddress : addresses?.[0],
                    addresses: addresses,
                    connector: account.name,
                    providerName: name,
                    isLoading: isLoading,
                    icon: resolveWalletConnectorIcon({ connector: evmConnectorNameResolver(account), address: activeAddress || addresses[0] }),
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
            setSelectedProvider(provider)
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
            addEVMAddresses(undefined)
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

    const availableWalletsforConnect = resolveAvailableWallets(allConnectors, connectedWallets)
    const resolvedConnectedWallets = getConnectedWallets()

    const provider = {
        connectWallet,
        disconnectWallets,
        connectedWallets: resolvedConnectedWallets,
        activeWallet: resolvedConnectedWallets.find(w => w.isActive),
        autofillSupportedNetworks,
        withdrawalSupportedNetworks,
        asSourceSupportedNetworks,
        availableWalletsForConnect: availableWalletsforConnect as any,
        name,
        id,
    }

    return provider
}

const resolveAvailableWallets = (all_connectors: readonly Connector[], connected: readonly Connector[]) => {

    const available_connectors = all_connectors.filter((connector, index, array) => {
        return connector?.['rkDetails']
            && array.findIndex(a => a?.['rkDetails']?.['id'] === connector?.['rkDetails']?.['id']) === index
            && !connected.some((connected_connector) => {
                return connected_connector?.['rkDetails']?.['id'] === connector?.['rkDetails']?.['id']
            })
    })
    return available_connectors

}
import { useConnectModal } from "@rainbow-me/rainbowkit"
import { Connector, useAccount, useConnectors, useDisconnect, useSwitchAccount } from "wagmi"
import { NetworkType } from "../../../Models/Network"
import { useSettingsState } from "../../../context/settings"
import KnownInternalNames from "../../knownIds"
import { useWalletModal } from "../../../context/walletModalContext"
import { NewWalletProvider } from "../../../hooks/useWalletNew"


export default function useEVMNew(): NewWalletProvider {
    const { networks } = useSettingsState()
    const name = 'evm'

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

    const { connectors: connectedWallets } = useSwitchAccount()
    const allConnectors = useConnectors()

    const availableWalletsforConnect = resolveAvailableWallets(allConnectors, connectedWallets)

    const res = {
        availableWalletsforConnect,
        connectedWallets
    }
console.log(...connectedWallets.map(resolveConnector))
    const getWallets = () => [
        ...connectedWallets.map(resolveConnector),
    ]

    return {
        getConnectedWallets: getWallet,
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

const resolveConnector = async (connector: Connector) => {
    return {
        address: await connector.getAccounts(),
        addresses: connector.accounts,
        iconUrl: connector?.['rkDetails']?.['iconUrl'],
    }
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
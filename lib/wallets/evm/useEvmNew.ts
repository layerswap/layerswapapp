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
import { addresses } from "@eth-optimism/contracts-ts"


export default function useEVM(): WalletProvider {
    const { networks } = useSettingsState()

    const withdrawalSupportedNetworks = [
        ...networks.filter(layer => layer.type === NetworkType.EVM && layer.name !== KnownInternalNames.Networks.RoninMainnet).map(l => l.name),
        KnownInternalNames.Networks.ZksyncMainnet,
        KnownInternalNames.Networks.LoopringMainnet,
        KnownInternalNames.Networks.LoopringSepolia,
    ]

    const autofillSupportedNetworks = [
        ...withdrawalSupportedNetworks,
        KnownInternalNames.Networks.ImmutableXMainnet,
        KnownInternalNames.Networks.ImmutableXGoerli,
        KnownInternalNames.Networks.BrineMainnet,
        KnownInternalNames.Networks.LoopringMainnet,
        KnownInternalNames.Networks.LoopringSepolia,
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

    return {
        getConnectedWallet: getWallet,
        connectWallet,
        availableWalletsforConnect,
        disconnectWallet,
        reconnectWallet,
        autofillSupportedNetworks,
        withdrawalSupportedNetworks,
        name
    }
}

const resolveConnector = (connector: Connector) => {
    return {
        address: connector.account,
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
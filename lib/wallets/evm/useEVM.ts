import { useConnectModal } from "@rainbow-me/rainbowkit"
import { Config, UseAccountReturnType, useAccount, useDisconnect, useSwitchAccount } from "wagmi"
import { Network, NetworkType } from "../../../Models/Network"
import { useSettingsState } from "../../../context/settings"
import { WalletProvider } from "../../../hooks/useWallet"
import KnownInternalNames from "../../knownIds"
import resolveWalletConnectorIcon from "../utils/resolveWalletIcon"
import { evmConnectorNameResolver } from "./KnownEVMConnectors"
import { useEffect, useState } from "react"
import { passportInstance, initilizePassport } from "../../../components/ImtblPassportProvider"
import { useRouter } from "next/router"

export default function useEVM(network?: Network): WalletProvider {
    const router = useRouter();
    const { networks } = useSettingsState()
    const [shouldConnect, setShouldConnect] = useState(false)
    const { disconnectAsync } = useDisconnect()
    useEffect(() => {
        if (shouldConnect) {
            connectWallet()
            setShouldConnect(false)
        }
    }, [shouldConnect])

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

    const name = 'evm'

    const account = useAccount()
    const { openConnectModal } = useConnectModal()

    useEffect(() => {
        if (shouldConnect) {
            connectWallet()
            setShouldConnect(false)
        }
    }, [shouldConnect])

    const getWallet = (network?: Network) => {
        if (account && account.address && account.connector) {
            const connector = account.connector.id
            if (account.connector?.name == "com.immutable.passport" && network && (network.name == KnownInternalNames.Networks.ImmutableZkEVM || network.name == KnownInternalNames.Networks.ImmutableXMainnet)) {
                return undefined
            }
            return {
                address: account.address,
                connector: account.connector.name || connector.charAt(0).toUpperCase() + connector.slice(1),
                providerName: name,
                icon: resolveWalletConnectorIcon({ connector: evmConnectorNameResolver(account.connector), address: account.address })
            }
        }
    }

    const connectWallet = async () => {
        if (account && account.address && account.connector) {
            await reconnectWallet()
        }
        else {
            return openConnectModal && openConnectModal()
        }
    }

    const disconnectWallet = async () => {
        try {
            await disconnectAsync()
            if (account?.connector?.name === 'Immutable Passport') {
                if (passportInstance === undefined) await initilizePassport(router.basePath)
                await passportInstance.logout()
            }
        }
        catch (e) {
            console.log(e)
        }
    }

    const reconnectWallet = async () => {
        try {
            await disconnectWallet()
            setShouldConnect(true)
        }
        catch (e) {
            console.log(e)
        }
    }



    return {
        getConnectedWallet: getWallet,
        connectWallet,
        disconnectWallet,
        reconnectWallet,
        autofillSupportedNetworks,
        withdrawalSupportedNetworks,
        name
    }
}
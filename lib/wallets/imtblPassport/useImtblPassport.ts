import { useConnectModal } from "@rainbow-me/rainbowkit"
import { useAccount, useDisconnect } from "wagmi"
import { WalletProvider } from "../../../hooks/useWallet"
import KnownInternalNames from "../../knownIds"
import ImtblPassportIcon from "../../../components/icons/Wallets/ImtblPassport"
import { useEffect, useState } from "react"

export default function useImtblPassport(): WalletProvider {
    const [shouldConnect, setShouldConnect] = useState(false)
    const { disconnectAsync } = useDisconnect()

    useEffect(() => {
        if (shouldConnect) {
            connectWallet()
            setShouldConnect(false)
        }
    }, [shouldConnect])

    const withdrawalSupportedNetworks = [
        KnownInternalNames.Networks.ImmutableZkEVM,
    ]

    const supportedConnectors = [
        "Immutable Passport"
    ]

    const autofillSupportedNetworks = withdrawalSupportedNetworks

    const name = 'imtblPassport'
    const account = useAccount()
    const { openConnectModal } = useConnectModal()
    const getWallet = () => {
        if (account && account.address && account.connector && supportedConnectors.includes(account.connector.name)) {
            return {
                address: account.address,
                connector: (account.connector as any)?._wallets?.[0]?.id || account.connector.id,
                providerName: name,
                icon: ImtblPassportIcon
            }
        }
    }

    const connectWallet = async () => {
        if (account && account.address && account.connector && !supportedConnectors.includes(account.connector.name)) {
            await reconnectWallet()
        }
        else {
            return openConnectModal && openConnectModal()
        }
    }

    const disconnectWallet = async () => {
        try {
            await disconnectAsync()
        }
        catch (e) {
            console.log(e)
        }
    }

    const reconnectWallet = async () => {
        try {
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
        disconnectWallet,
        reconnectWallet,
        autofillSupportedNetworks,
        withdrawalSupportedNetworks,
        name
    }
}
import { useTonConnectUI, useTonWallet } from "@tonconnect/ui-react"
import { Address } from "@ton/core";
import KnownInternalNames from "../../knownIds";
import { Wallet } from "../../../stores/walletStore";
import { WalletProvider } from "../../../hooks/useWallet";
import TON from "../../../components/icons/Wallets/TON";
import { useEffect, useState } from "react";

export default function useTON(): WalletProvider {
    const withdrawalSupportedNetworks = [KnownInternalNames.Networks.TONMainnet]
    const name = 'ton'
    const wallet = useTonWallet();
    const [tonConnectUI] = useTonConnectUI();
    const [shouldConnect, setShouldConnect] = useState(false)

    useEffect(() => {
        if (shouldConnect) {
            connectWallet()
            setShouldConnect(false)
        }
    }, [shouldConnect])

    const getWallet = () => {
        if (wallet) {
            const w: Wallet = {
                address: Address.parse(wallet.account.address).toString({ bounceable: false }),
                connector: 'TON',
                providerName: name,
                icon: TON
            }
            return w
        }
    }

    const connectWallet = () => {
        return tonConnectUI.openModal()
    }

    const disconnectWallet = async () => {
        try {
            await tonConnectUI.disconnect()
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
        withdrawalSupportedNetworks,
        autofillSupportedNetworks: withdrawalSupportedNetworks,
        asSourceSupportedNetworks: withdrawalSupportedNetworks,
        name
    }
}
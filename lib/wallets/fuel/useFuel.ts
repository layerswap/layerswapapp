import KnownInternalNames from "../../knownIds";
import { Wallet } from "../../../stores/walletStore";
import { WalletProvider } from "../../../hooks/useWallet";
import { useEffect, useState } from "react";
import {
    useConnectUI,
    useDisconnect,
    useWallet,
} from '@fuels/react';
import Fuel from "../../../components/icons/Wallets/Fuel";

export default function useFuel(): WalletProvider {
    const autofillSupportedNetworks = [KnownInternalNames.Networks.FuelTestnet]
    const name = 'fuel'

    const { wallet } = useWallet()
    const { connect } = useConnectUI()
    const { disconnectAsync } = useDisconnect()

    const [shouldConnect, setShouldConnect] = useState(false)

    useEffect(() => {
        if (shouldConnect) {
            connectWallet()
            setShouldConnect(false)
        }
    }, [shouldConnect])

    const getWallet = () => {
        if (wallet) {
            const address = wallet.address.toString()
            const w: Wallet = {
                address: address,
                connector: 'Fuel',
                providerName: name,
                icon: Fuel
            }
            return w
        }
    }

    const connectWallet = () => {
        return connect()
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
        name
    }
}
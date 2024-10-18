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
import useStorage from "../../../hooks/useStorage";

export default function useFuel(): WalletProvider {
    const autofillSupportedNetworks = [KnownInternalNames.Networks.FuelTestnet]
    const name = 'fuel'

    const { wallet, isRefetching, isLoading, isFetching } = useWallet()
    const { connect,isConnecting } = useConnectUI()
    const { disconnectAsync } = useDisconnect()
    const { storageAvailable, setItem, getItem } = useStorage()

    const [shouldConnect, setShouldConnect] = useState(false)

    useEffect(() => {
        if (shouldConnect) {
            connectWallet()
            setShouldConnect(false)
        }
    }, [shouldConnect])

    const getWallet = () => {
        if (!isConnecting && !isFetching && !isRefetching && storageAvailable && !wallet?.address && !isLoading) {
            const fuelCurrentConnector = getItem('fuel-current-connector', 'localStorage')
            if (fuelCurrentConnector && fuelCurrentConnector === 'Bako Safe') {
                setItem('fuel-current-connector', '', 'localStorage')
            }
        }

        if (wallet) {
            const address = wallet.address.toB256()
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
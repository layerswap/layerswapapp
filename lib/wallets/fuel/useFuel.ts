import KnownInternalNames from "../../knownIds";
import { Wallet } from "../../../stores/walletStore";
import { WalletProvider } from "../../../hooks/useWallet";
import {
    useConnectUI,
    useDisconnect,
    useWallet,
} from '@fuels/react';
import useStorage from "../../../hooks/useStorage";
import resolveWalletConnectorIcon from "../utils/resolveWalletIcon";

export default function useFuel(): WalletProvider {
    const autofillSupportedNetworks = [KnownInternalNames.Networks.FuelTestnet]
    const name = 'fuel'

    const { wallet, isRefetching, isLoading, isFetching } = useWallet()
    const { connect, isConnecting } = useConnectUI()
    const { disconnectAsync } = useDisconnect()
    const { storageAvailable, setItem, getItem } = useStorage()

    const getWallet = () => {

        if (!isConnecting && !isFetching && !isRefetching && storageAvailable && !wallet?.address && !isLoading) {
            const fuelCurrentConnector = getItem('fuel-current-connector', 'localStorage')

            if (fuelCurrentConnector && fuelCurrentConnector === 'Bako Safe') {
                setItem('fuel-current-connector', '', 'localStorage')
            }
        }

        if (wallet) {
            const fuelCurrentConnector = getItem('fuel-current-connector', 'localStorage')

            const address = wallet.address.toB256()
            const w: Wallet = {
                address: address,
                connector: fuelCurrentConnector,
                providerName: name,
                icon: resolveWalletConnectorIcon({ connector: fuelCurrentConnector, address: address })
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
            connectWallet()
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
import KnownInternalNames from "../../knownIds";
import {
    useConnectUI,
    useDisconnect,
    useWallet,
    useConnectors
} from '@fuels/react';
import useStorage from "../../../hooks/useStorage";
import { useAccount, useConnections } from "wagmi";
import {
    Predicate,
    getPredicateRoot,
} from '@fuel-ts/account';
import { Address } from '@fuel-ts/address';

import shortenAddress from "../../../components/utils/ShortenAddress";
import { BAKO_STATE } from "./Basko";
import { resolveWalletConnectorIcon } from "../utils/resolveWalletIcon";
import { Wallet, WalletProvider } from "../../../Models/WalletProvider";

export default function useFuel(): WalletProvider {
    const autofillSupportedNetworks = [KnownInternalNames.Networks.FuelTestnet, KnownInternalNames.Networks.FuelMainnet]
    const name = 'Fuel'
    const id = 'fuel'

    const { wallet, isRefetching, isLoading, isFetching } = useWallet()
    const { connect, isConnecting } = useConnectUI()
    const { disconnectAsync } = useDisconnect()
    const { storageAvailable, setItem, getItem } = useStorage()
    const { address: evmAddress, connector: evmConnector } = useAccount()
    const { connectors } = useConnectors()

    const getWallet = () => {

        if (wallet) {
            let fuelCurrentConnector = getItem('fuel-current-connector', 'localStorage')

            let customConnectorname: string | undefined = undefined
            const fuelEvmConnector = connectors.find(c => c.name === 'Ethereum Wallets')
            const fuelSolanaConnector = connectors.find(c => c.name === 'Solana Wallets')

            const address = wallet.address.toB256()

            if (fuelEvmConnector && evmAddress && fuelEvmConnector.connected && evmConnector) {
                // @ts-expect-error processPredicateData is only available in the Predicate class
                const { predicateBytes } = Predicate.processPredicateData(
                    (fuelEvmConnector as any)?.predicateAccount?.bytecode,
                    (fuelEvmConnector as any)?.predicateAccount?.abi,
                    {
                        SIGNER: (fuelEvmConnector as any)?.predicateAccount?.adapter?.convertAddress(evmAddress),
                    },
                );
                const convertedAddress = Address.fromB256(getPredicateRoot(predicateBytes)).toString();
                if (convertedAddress.toLowerCase() === address.toLowerCase()) {
                    fuelCurrentConnector = `${evmConnector.name} (${shortenAddress(evmAddress)})`
                    customConnectorname = evmConnector.name
                }
            }

            const w: Wallet = {
                address: address,
                addresses: [address],
                isActive: true,
                connect: connectWallet,
                disconnect: disconnectWallets,
                connector: fuelCurrentConnector,
                providerName: name,
                icon: resolveWalletConnectorIcon({ connector: customConnectorname || fuelCurrentConnector, address: address })
            }

            return [w]
        }
    }

    const connectWallet = () => {
        BAKO_STATE.state.last_req = undefined
        BAKO_STATE.period_durtion = 120_000
        return connect()
    }

    const disconnectWallets = async () => {
        try {
            BAKO_STATE.state.last_req = undefined
            BAKO_STATE.period_durtion = 10_000
            await disconnectAsync()
        }
        catch (e) {
            console.log(e)
        }
    }

    const reconnectWallet = async () => {
        try {
            await disconnectWallets()
            connectWallet()
        }
        catch (e) {
            console.log(e)
        }
    }

    return {
        connectWallet,
        disconnectWallets,
        autofillSupportedNetworks,
        activeAccountAddress: wallet?.address.toB256(),
        activeWallet: getWallet()?.[0],
        connectedWallets: getWallet(),
        switchAccount: reconnectWallet,
        name,
        id,
    }
}

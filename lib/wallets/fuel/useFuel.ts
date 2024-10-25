import KnownInternalNames from "../../knownIds";
import { Wallet } from "../../../stores/walletStore";
import { WalletProvider } from "../../../hooks/useWallet";
import {
    useConnectUI,
    useDisconnect,
    useWallet,
    useConnectors
} from '@fuels/react';
import useStorage from "../../../hooks/useStorage";
import resolveWalletConnectorIcon from "../utils/resolveWalletIcon";
import { useAccount, useConnections } from "wagmi";
import {
    FuelConnector,
    Predicate,
    getPredicateRoot,
} from '@fuel-ts/account';
import { Address } from '@fuel-ts/address';
import { useWallet as useSolanaWallet } from "@solana/wallet-adapter-react"

import shortenAddress from "../../../components/utils/ShortenAddress";

export default function useFuel(): WalletProvider {
    const autofillSupportedNetworks = [KnownInternalNames.Networks.FuelTestnet]
    const name = 'fuel'

    const { wallet, isRefetching, isLoading, isFetching } = useWallet()
    const { connect, isConnecting } = useConnectUI()
    const { disconnectAsync } = useDisconnect()
    const { storageAvailable, setItem, getItem } = useStorage()
    const { address: evmAddress, connector: evmConnector } = useAccount()
    const { connectors } = useConnectors()
    const { publicKey, wallet: solanaWallet } = useSolanaWallet();


    const getWallet = () => {

        // if (!isConnecting && !isFetching && !isRefetching && storageAvailable && !wallet?.address && !isLoading) {
        //     const fuelCurrentConnector = getItem('fuel-current-connector', 'localStorage')

        //     if (fuelCurrentConnector && fuelCurrentConnector === 'Bako Safe') {
        //         setItem('fuel-current-connector', '', 'localStorage')
        //     }
        // }

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
            // else if (fuelSolanaConnector && fuelSolanaConnector.connected && solanaWallet?.adapter && publicKey) {
            //     // @ts-expect-error processPredicateData is only available in the Predicate class
            //     const { predicateBytes } = Predicate.processPredicateData(
            //         (fuelEvmConnector as any)?.predicateAccount?.bytecode,
            //         (fuelEvmConnector as any)?.predicateAccount?.abi,
            //         {
            //             SIGNER: (fuelEvmConnector as any)?.predicateAccount?.adapter?.convertAddress(publicKey?.toBase58()),
            //         },
            //     );
            //     const convertedAddress = Address.fromB256(getPredicateRoot(predicateBytes)).toString();
            //     console.log("convertedAddress", convertedAddress)
            //     if (convertedAddress.toLowerCase() === address.toLowerCase()) {
            //         fuelCurrentConnector = `${solanaWallet.adapter.name} (${shortenAddress(publicKey?.toBase58())})`
            //         customConnectorname = solanaWallet.adapter.name
            //     }
            // }

            const w: Wallet = {
                address: address,
                connector: fuelCurrentConnector,
                providerName: name,
                icon: resolveWalletConnectorIcon({ connector: customConnectorname || fuelCurrentConnector, address: address })
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

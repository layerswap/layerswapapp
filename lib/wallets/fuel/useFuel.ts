import KnownInternalNames from "../../knownIds";
import {
    useDisconnect,
    useWallet,
    useConnectors,
} from '@fuels/react';
import useStorage from "../../../hooks/useStorage";
import { useAccount } from "wagmi";
import {
    Predicate,
    getPredicateRoot,
} from '@fuel-ts/account';
import { Address } from '@fuel-ts/address';
import shortenAddress from "../../../components/utils/ShortenAddress";
import { BAKO_STATE } from "./Basko";
import { resolveWalletConnectorIcon } from "../utils/resolveWalletIcon";
import { InternalConnector, Wallet, WalletProvider } from "../../../Models/WalletProvider";
import { useConnectModal } from "../../../components/WalletModal";
import { useMemo } from "react";

export default function useFuel(): WalletProvider {
    const autofillSupportedNetworks = [
        KnownInternalNames.Networks.FuelTestnet,
        KnownInternalNames.Networks.FuelMainnet
    ]
    const name = 'Fuel'
    const id = 'fuel'

    const { wallet } = useWallet()
    const { disconnectAsync } = useDisconnect()
    const { getItem } = useStorage()
    const { address: evmAddress, connector: evmConnector } = useAccount()
    const { connectors } = useConnectors()

    const { connect } = useConnectModal()

    const connectWallet = async () => {
        try {
            return await connect(provider)
        }
        catch (e) {
            console.log(e)
        }
    }

    const connectConnector = async ({ connector }: { connector: InternalConnector }) => {
        try {

            const fuelConnector = connectors.find(w => w.name === connector.name)

            if (!fuelConnector?.installed) {
                const installLink = fuelConnector?.metadata.install.link
                if (installLink) {
                    window.open(installLink, "_blank");
                    return
                }
            }

            BAKO_STATE.state.last_req = undefined
            BAKO_STATE.period_durtion = 120_000
            await fuelConnector?.connect()

            const connectedWallets = await fuelConnector?.accounts()

            if (connectedWallets) {
                const wallet = Address.fromAddressOrString(connectedWallets[0]).toB256()

                const result = resolveWallet(wallet, connectors, evmAddress, evmConnector, connectWallet, disconnectWallets, name, getItem, autofillSupportedNetworks)

                return result
            }

        }
        catch (e) {
            console.log(e)
        }
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

    const connectedWallets: Wallet[] | undefined = useMemo(() => {

        if (!wallet) return
        const result = resolveWallet(wallet.address.toB256(), connectors, evmAddress, evmConnector, connectWallet, disconnectWallets, name, getItem, autofillSupportedNetworks)

        return [result]
    }, [wallet, connectors, evmAddress, evmConnector, name])

    const availableWalletsForConnect: InternalConnector[] = connectors.map(c => {

        const name = c.installed ? c.name : `Install ${c.name}`

        return {
            name: name,
            id: c.name,
            type: c.installed ? 'injected' : 'other',
        }
    })

    const provider = {
        connectWallet,
        connectConnector,
        disconnectWallets,
        switchAccount: reconnectWallet,
        availableWalletsForConnect,
        autofillSupportedNetworks,
        activeWallet: connectedWallets?.[0],
        connectedWallets,
        name,
        id,
    }

    return provider
}

const resolveWallet = (address: string, connectors, evmAddress, evmConnector, connectWallet, disconnectWallets, name, getItem, autofillSupportedNetworks) => {
    let fuelCurrentConnector = getItem('fuel-current-connector', 'localStorage')

    let customConnectorname: string | undefined = undefined
    const fuelEvmConnector = connectors.find(c => c.name === 'Ethereum Wallets')
    const fuelSolanaConnector = connectors.find(c => c.name === 'Solana Wallets')

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
        icon: resolveWalletConnectorIcon({ connector: customConnectorname || fuelCurrentConnector, address: address }),
        autofillSupportedNetworks
    }

    return w
}
import KnownInternalNames from "../../knownIds";
import {
    useDisconnect,
    useWallet,
    useConnectors
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
import { useWalletModalState } from "../../../stores/walletModalStateStore";

export default function useFuel(): WalletProvider {
    const autofillSupportedNetworks = [KnownInternalNames.Networks.FuelTestnet, KnownInternalNames.Networks.FuelMainnet]
    const name = 'Fuel'
    const id = 'fuel'

    const { wallet } = useWallet()
    const { disconnectAsync } = useDisconnect()
    const { getItem } = useStorage()
    const { address: evmAddress, connector: evmConnector } = useAccount()
    const { connectors } = useConnectors()

    const setWalletModalIsOpen = useWalletModalState((state) => state.setOpen)
    const setSelectedProvider = useWalletModalState((state) => state.setSelectedProvider)

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

    const connectWallet = async () => {
        try {
            setSelectedProvider(provider)
            setWalletModalIsOpen(true)
        }
        catch (e) {
            console.log(e)
        }
    }

    const connectConnector = async ({ connector }: { connector: InternalConnector }) => {
        try {

            const fuelConnector = connectors.find(w => w.name === connector.name)

            if (!fuelConnector?.installed) {
                const installLink = connectorsConfigs.find(c => c.id === connector.id)
                if (installLink) {
                    window.open(installLink.installLink, "_blank");
                    return
                }
            }

            BAKO_STATE.state.last_req = undefined
            BAKO_STATE.period_durtion = 120_000
            await fuelConnector?.connect()
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
        activeAccountAddress: wallet?.address.toB256(),
        activeWallet: getWallet()?.[0],
        connectedWallets: getWallet(),
        name,
        id,
    }

    return provider
}

const connectorsConfigs = [
    {
        id: "Fuel Wallet",
        installLink: "https://chromewebstore.google.com/detail/fuel-wallet/dldjpboieedgcmpkchcjcbijingjcgok"
    },
    {
        id: "Fuelet Wallet",
        installLink: "https://fuelet.app/download/"
    },
]

import { InternalConnector, WalletProvider } from "../../../hooks/useWallet";
import { Wallet } from "../../../stores/walletStore"
import KnownInternalNames from "../../knownIds"
import { resolveWalletConnectorIcon } from "../utils/resolveWalletIcon";
import toast from "react-hot-toast";
import { useSettingsState } from "../../../context/settings";
import { useConnect, useAccount } from "@starknet-react/core";
import { useWalletModalState } from "../../../stores/walletModalStateStore";
import { useCallback } from "react";


export default function useStarknet(): WalletProvider {
    const commonSupportedNetworks = [
        KnownInternalNames.Networks.StarkNetMainnet,
        KnownInternalNames.Networks.StarkNetGoerli,
        KnownInternalNames.Networks.StarkNetSepolia
    ]

    const withdrawalSupportedNetworks = [
        ...commonSupportedNetworks,
        KnownInternalNames.Networks.ParadexMainnet,
        KnownInternalNames.Networks.ParadexTestnet,
    ]

    const name = 'Starknet'
    const id = 'starknet'
    const { networks } = useSettingsState()

    const { account, chainId, connector } = useAccount()
    const { connectAsync: connect, connectors } = useConnect();

    const setWalletModalIsOpen = useWalletModalState((state) => state.setOpen)
    const setSelectedProvider = useWalletModalState((state) => state.setSelectedProvider)

    const isMainnet = networks?.some(network => network.name === KnownInternalNames.Networks.StarkNetMainnet)

    const connectWallet = async () => {
        try {
            setSelectedProvider(provider)
            setWalletModalIsOpen(true)
        }
        catch (e) {
            console.log(e)
        }
    }

    const connectConnector = async ({ connector }) => {
        toast.dismiss('connect-wallet')

        try {
            const starknetConnector = connectors.find(c => c.id === connector.id)

            await connect({ connector: starknetConnector })

        }
        catch (e) {
            console.log(e)
            toast.error(e.message, { id: 'connect-wallet', duration: 30000 })
        }
    }

    const disconnectWallets = async () => {
        const disconnect = (await import('starknetkit')).disconnect
        try {
            await disconnect({ clearLastWallet: true })
        }
        catch (e) {
            console.log(e)
        }
    }

    const availableWalletsForConnect: InternalConnector[] = connectors.map(connector => {
        return {
            name: connector.name,
            id: connector.id,
            icon: typeof connector.icon === 'string' ? connector.icon : `data:image/svg+xml;base64,${btoa(connector.icon.dark)}`
        }
    })


    //fix this
    const getWallet = useCallback(() => {
        if (account) {

            const walletChain = account && `0x${chainId?.toString(16)}`
            const wrongChanin = walletChain == '0x534e5f4d41494e' ? !isMainnet : isMainnet

            if (account && wrongChanin) {
                disconnectWallets()
                const errorMessage = `Please switch the network in your wallet to ${isMainnet ? 'Mainnet' : 'Sepolia'} and click connect again`
                toast.error(errorMessage)
                // throw new Error(errorMessage)
            }

            if (account && connector?.account && connector) {

                const wallet: Wallet = {
                    address: account.address,
                    addresses: [account.address],
                    chainId: walletChain,
                    icon: resolveWalletConnectorIcon({ connector: connector.name, address: account.address }),
                    connector: connector.name,
                    providerName: name,
                    metadata: {
                        starknetAccount: account,
                        // wallet: account
                    },
                    isActive: true,
                    connect: () => connectWallet(),
                    disconnect: () => disconnectWallets()
                }

                return [wallet]
            }

        }

        return undefined
    }, [account, chainId, connector, connect, disconnectWallets, isMainnet])

    const provider: WalletProvider = {
        switchAccount: async () => { },
        connectedWallets: getWallet(),
        connectWallet,
        connectConnector,
        disconnectWallets,
        withdrawalSupportedNetworks,
        autofillSupportedNetworks: commonSupportedNetworks,
        asSourceSupportedNetworks: commonSupportedNetworks,
        availableWalletsForConnect: availableWalletsForConnect,
        name,
        id,
        activeWallet: getWallet()?.[0],
        activeAccountAddress: getWallet()?.[0].address
    }

    return provider
}

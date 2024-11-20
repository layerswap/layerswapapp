import { useWalletStore } from "../../../stores/walletStore"
import KnownInternalNames from "../../knownIds"
import { resolveWalletConnectorIcon } from "../utils/resolveWalletIcon";
import toast from "react-hot-toast";
import { useSettingsState } from "../../../context/settings";
import { useConnect, useDisconnect } from "@starknet-react/core";
import { useWalletModalState } from "../../../stores/walletModalStateStore";
import { InternalConnector, WalletProvider } from "../../../Models/WalletProvider";

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

    const { connectors } = useConnect();
    const { disconnectAsync } = useDisconnect()

    const wallets = useWalletStore((state) => state.connectedWallets)
    const addWallet = useWalletStore((state) => state.connectWallet)
    const removeWallet = useWalletStore((state) => state.disconnectWallet)

    const setWalletModalIsOpen = useWalletModalState((state) => state.setOpen)
    const setSelectedProvider = useWalletModalState((state) => state.setSelectedProvider)

    const isMainnet = networks?.some(network => network.name === KnownInternalNames.Networks.StarkNetMainnet)

    const getWallet = () => {

        const wallet = wallets.find(wallet => wallet.providerName === name)

        if (!wallet) return

        return [wallet]
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

    const connectConnector = async ({ connector }) => {
        toast.dismiss('connect-wallet')

        try {
            const starknetConnector = connectors.find(c => c.id === connector.id)

            if (!starknetConnector?.["_wallet"]) {
                const installLink = connectorsConfigs.find(c => c.id === connector.id)
                if (installLink) {
                    window.open(installLink.installLink, "_blank");
                    return
                }
            }

            const result = await starknetConnector?.connect({})

            const walletChain = `0x${result?.chainId?.toString(16)}`
            const wrongChanin = walletChain == '0x534e5f4d41494e' ? !isMainnet : isMainnet

            if (result?.account && wrongChanin) {
                disconnectWallets()
                const errorMessage = `Please switch the network in your wallet to ${isMainnet ? 'Mainnet' : 'Sepolia'} and click connect again`
                toast.error(errorMessage)
                // throw new Error(errorMessage)
            }

            if (result?.account && starknetConnector) {
                const starkent = networks.find(n => n.name === KnownInternalNames.Networks.StarkNetMainnet || n.name === KnownInternalNames.Networks.StarkNetSepolia)
                const WalletAccount = (await import('starknet')).WalletAccount

                const starknetWalletAccount = new WalletAccount({ nodeUrl: starkent?.node_url }, (starknetConnector as any).wallet);

                addWallet({
                    address: result?.account,
                    addresses: [result?.account],
                    chainId: walletChain,
                    icon: resolveWalletConnectorIcon({ connector: connector.name, address: result?.account }),
                    connector: connector.name,
                    providerName: name,
                    metadata: {
                        starknetAccount: starknetWalletAccount,
                        // wallet: account
                    },
                    isActive: true,
                    connect: () => connectWallet(),
                    disconnect: () => disconnectWallets()

                })
            }
        }

        catch (e) {
            console.log(e)
            toast.error(e.message, { id: 'connect-wallet', duration: 30000 })
        }
    }

    const disconnectWallets = async () => {
        try {
            await disconnectAsync()
            removeWallet(name)
        }
        catch (e) {
            console.log(e)
        }
    }

    const availableWalletsForConnect: InternalConnector[] = connectors.map(connector => {

        const name = (!connectorsConfigs.some(c => c.id === connector.id) || connector?.["_wallet"]) ? connector.name : `Install ${connectorsConfigs.find(c => c.id === connector.id)?.name}`

        return {
            name: name,
            id: connector.id,
            icon: typeof connector.icon === 'string' ? connector.icon : `data:image/svg+xml;base64,${btoa(connector.icon.dark)}`
        }
    })

    const provider: WalletProvider = {
        switchAccount: async () => { },
        connectWallet,
        connectConnector,
        disconnectWallets,
        connectedWallets: getWallet(),
        activeWallet: getWallet()?.[0],
        activeAccountAddress: getWallet()?.[0]?.address,
        withdrawalSupportedNetworks,
        autofillSupportedNetworks: commonSupportedNetworks,
        asSourceSupportedNetworks: commonSupportedNetworks,
        availableWalletsForConnect: availableWalletsForConnect,
        name,
        id,
    }

    return provider
}


const connectorsConfigs = [
    {
        id: "braavos",
        name: "Braavos",
        installLink: "https://chromewebstore.google.com/detail/braavos-starknet-wallet/jnlgamecbpmbajjfhmmmlhejkemejdma"
    },
    {
        id: "argent",
        name: 'Argent X',
        installLink: "https://chromewebstore.google.com/detail/argent-x-starknet-wallet/dlcobpjiigpikoobohmabehhmhfoodbb"
    },
    {
        id: "keplr",
        name: 'Keplr',
        installLink: "https://chromewebstore.google.com/detail/keplr/dmkamcknogkgcdfhhbddcghachkejeap"
    }
]

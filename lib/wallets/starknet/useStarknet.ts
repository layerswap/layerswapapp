import { InternalConnector, WalletProvider } from "../../../hooks/useWallet";
import { useWalletStore } from "../../../stores/walletStore"
import KnownInternalNames from "../../knownIds"
import { resolveWalletConnectorIcon } from "../utils/resolveWalletIcon";
import toast from "react-hot-toast";
import { useSettingsState } from "../../../context/settings";
import { useWalletModalState } from "../../../stores/walletModalStateStore";

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

    }

    const disconnectWallets = async () => {
        try {
           
        }
        catch (e) {
            console.log(e)
        }
    }

    const availableWalletsForConnect: InternalConnector[] = []

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

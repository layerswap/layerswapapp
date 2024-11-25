import { useWalletStore } from "../../../stores/walletStore"
import ImtblClient from "../../imtbl"
import KnownInternalNames from "../../knownIds"
import IMX from "../../../components/icons/Wallets/IMX"
import { WalletProvider } from "../../../Models/WalletProvider"

export default function useImtblX(): WalletProvider {
    const withdrawalSupportedNetworks = [
        KnownInternalNames.Networks.ImmutableXMainnet,
        KnownInternalNames.Networks.ImmutableXGoerli,
        KnownInternalNames.Networks.ImmutableXSepolia,
    ]

    const name = 'ImmutableX'
    const id = 'imx'
    const wallets = useWalletStore((state) => state.connectedWallets)
    const addWallet = useWalletStore((state) => state.connectWallet)
    const removeWallet = useWalletStore((state) => state.disconnectWallet)
    const wallet = wallets.find(wallet => wallet.providerName === name)

    const getWallet = () => {
        if (wallet) {
            return [wallet]
        }
        return undefined
    }
    type ConnectProps = {
        chain?: string | number
    }
    const connectWallet = async (props?: ConnectProps) => {
        const { chain } = props || {}
        if (!chain) throw new Error('No chain id for imx connect wallet')
        const networkName = chain == 'testnet' ? KnownInternalNames.Networks.ImmutableXGoerli : KnownInternalNames.Networks.ImmutableXMainnet
        try {
            const imtblClient = new ImtblClient(networkName)
            const res = await imtblClient.ConnectWallet();

            const wallet = {
                address: res.address,
                connector: 'imx',
                providerName: name,
                icon: IMX,
                disconnect: () => disconnectWallet(),
                connect: () => connectWallet({ chain }),
                isActive: true,
                addresses: [res.address]
            }

            addWallet(wallet);
            return [wallet]
        }
        catch (e) {
            console.log(e)
        }
    }

    const disconnectWallet = () => {
        return removeWallet(name)
    }

    return {
        switchAccount: async () => { },
        connectedWallets: getWallet(),
        activeWallet: wallet,
        connectWallet,
        disconnectWallets: disconnectWallet,
        withdrawalSupportedNetworks,
        asSourceSupportedNetworks: withdrawalSupportedNetworks,
        name,
        id,
    }
}
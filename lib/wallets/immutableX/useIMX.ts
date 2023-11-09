import { useWalletStore } from "../../../stores/walletStore"
import ImtblClient from "../../imtbl"
import KnownInternalNames from "../../knownIds"
import { WalletProvider } from "../../../hooks/useWallet"
import IMX from "../../../components/icons/Wallets/IMX"

export default function useImmutableX(): WalletProvider {
    const withdrawalSupportedNetworks = [KnownInternalNames.Networks.ImmutableXMainnet, KnownInternalNames.Networks.ImmutableXGoerli]
    const name = 'imx'
    const wallets = useWalletStore((state) => state.connectedWallets)
    const addWallet = useWalletStore((state) => state.connectWallet)
    const removeWallet = useWalletStore((state) => state.disconnectWallet)

    const getWallet = () => {
        return wallets.find(wallet => wallet.providerName === name)
    }

    const connectWallet = async (chain: string | number) => {
        if (!chain) throw new Error('No chain id for imx connect wallet')
        const networkName = chain == 1 ? KnownInternalNames.Networks.ImmutableXMainnet : KnownInternalNames.Networks.ImmutableXGoerli
        try {
            const imtblClient = new ImtblClient(networkName)
            const res = await imtblClient.ConnectWallet();
            addWallet({
                address: res.address,
                connector: 'imx',
                providerName: name,
                icon: IMX
            });
        }
        catch (e) {
            console.log(e)
        }
    }

    const disconnectWallet = () => {
        return removeWallet(name)
    }

    return {
        getConnectedWallet: getWallet,
        connectWallet,
        disconnectWallet,
        withdrawalSupportedNetworks: withdrawalSupportedNetworks,
        name
    }
}
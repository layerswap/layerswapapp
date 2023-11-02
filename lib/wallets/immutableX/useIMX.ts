import { Layer } from "../../../Models/Layer"
import { useWalletStore } from "../../../stores/walletStore"
import ImtblClient from "../../imtbl"
import KnownInternalNames from "../../knownIds"
import { WalletProvider } from "../../../hooks/useWallet"

export default function useImmutableX(): WalletProvider {
    const SupportedNetworks = [KnownInternalNames.Networks.ImmutableXMainnet, KnownInternalNames.Networks.ImmutableXGoerli]

    const wallets = useWalletStore((state) => state.connectedWallets)
    const addWallet = useWalletStore((state) => state.connectWallet)
    const removeWallet = useWalletStore((state) => state.disconnectWallet)

    const getWallet = () => {
        return wallets.find(wallet => SupportedNetworks.includes(wallet.network.internal_name))
    }

    const connectWallet = async (network: Layer) => {
        if (network.isExchange === true) return
        try {
            const imtblClient = new ImtblClient(network.internal_name)
            const res = await imtblClient.ConnectWallet();
            if (network) {
                addWallet({
                    address: res.address,
                    network: network,
                    connector: res.providerPreference
                });
            }
        }
        catch (e) {
            console.log(e)
        }
    }

    const disconnectWallet = (network: Layer) => {
        return removeWallet(network)
    }

    return {
        getWallet,
        connectWallet,
        disconnectWallet,
        SupportedNetworks
    }
}
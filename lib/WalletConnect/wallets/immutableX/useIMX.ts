import { LinkResults } from "@imtbl/imx-sdk"
import { Layer } from "../../../../Models/Layer"
import { useWalletStore } from "../../../../stores/walletStore"
import ImtblClient from "../../../imtbl"
import KnownInternalNames from "../../../knownIds"

export default function useImmutableX() {
    const SupportedNetworks = [KnownInternalNames.Networks.ImmutableXMainnet, KnownInternalNames.Networks.ImmutableXGoerli]

    const wallets = useWalletStore((state) => state.connectedWallets)
    const addWallet = useWalletStore((state) => state.connectWallet)
    const removeWallet = useWalletStore((state) => state.disconnectWallet)

    const getWallet = () => {
        return wallets.find(wallet => wallet.network.internal_name === KnownInternalNames.Networks.ImmutableXMainnet || wallet.network.internal_name === KnownInternalNames.Networks.ImmutableXGoerli)
    }

    const connectWallet = async (network: Layer): Promise<LinkResults.Setup | undefined> => {
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
            return res
        }
        catch (e) {
            console.log(e)
        }
    }

    const disconnectWallet = (network: Layer) => {
        removeWallet(network)
    }

    return {
        getWallet,
        connectWallet,
        disconnectWallet,
        SupportedNetworks
    }
}
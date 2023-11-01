import { Layer } from "../../../../Models/Layer"
import { useWalletStore } from "../../../../stores/walletStore"
import KnownInternalNames from "../../../knownIds"

export default function useStarknet() {
    const SupportedNetworks = [KnownInternalNames.Networks.StarkNetMainnet, KnownInternalNames.Networks.StarkNetGoerli]
    const wallets = useWalletStore((state) => state.connectedWallets)
    const addWallet = useWalletStore((state) => state.connectWallet)
    const removeWallet = useWalletStore((state) => state.disconnectWallet)

    const getWallet = () => {
        return wallets.find(wallet => wallet.network.internal_name === KnownInternalNames.Networks.StarkNetGoerli || wallet.network.internal_name === KnownInternalNames.Networks.StarkNetMainnet)
    }

    const connectWallet = async (network: Layer) => {
        const connect = (await import('starknetkit')).connect;
        try {
            const res = await connect()
            if (res && res.account) {
                addWallet({
                    address: res.account.address,
                    network: network,
                    chainId: res.provider.provider.chainId,
                    icon: res.icon,
                    connector: res.name,
                    metadata: {
                        starknetAccount: res
                    }
                })
            }
            return res
        }
        catch (e) {
            throw new Error(e)
        }
    }

    const disconnectWallet = async (network: Layer) => {
        const disconnect = (await import('starknetkit')).disconnect;
        try {
            disconnect({ clearLastWallet: true })
            removeWallet(network)
        }
        catch (e) {
            console.log(e)
        }
    }

    return {
        getWallet,
        connectWallet,
        disconnectWallet,
        SupportedNetworks
    }
}
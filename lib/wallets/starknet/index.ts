import { Layer } from "../../../Models/Layer"
import { useWalletStore } from "../../../stores/walletStore"
import { StarknetWindowObject, connect, disconnect } from "get-starknet"
import KnownInternalNames from "../../knownIds"

export default function useStarknet() {
    const wallets = useWalletStore((state) => state.connectedWallets)
    const addWallet = useWalletStore((state) => state.connectWallet)
    const removeWallet = useWalletStore((state) => state.disconnectWallet)

    const getWallet = () => {
        return wallets.find(wallet => wallet.network.internal_name === KnownInternalNames.Networks.StarkNetGoerli || wallet.network.internal_name === KnownInternalNames.Networks.StarkNetMainnet)
    }

    const connectWallet = async (network: Layer) => {
        try {
            const res = await connect()
            if (res && res.account) {
                addWallet({
                    address: res.account.address,
                    network: network,
                    icon: res.icon,
                    connector: res.name,
                    metadata: {
                        starknetAccount: res.account
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
        try {
            disconnect({ clearLastWallet: true })
            removeWallet(network)
        }
        catch (e) {
            console.log(e)
        }
    }

    return {
        getStarknetWallet: getWallet,
        connectStarknet: connectWallet,
        disconnectStarknet: disconnectWallet
    }
}
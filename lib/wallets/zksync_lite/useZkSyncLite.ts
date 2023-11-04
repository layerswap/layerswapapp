import { Layer } from "../../../Models/Layer"
import { WalletProvider } from "../../../hooks/useWallet";
import { useWalletStore } from "../../../stores/walletStore"
import KnownInternalNames from "../../knownIds"
import { constants } from "starknet";
import {connect, disconnect} from 'starknetkit'

export default function useZkSyncLite(): WalletProvider {
    const SupportedNetworks = [KnownInternalNames.Networks.ZksyncMainnet]
    const WALLETCONNECT_PROJECT_ID = '28168903b2d30c75e5f7f2d71902581b';
    const wallets = useWalletStore((state) => state.connectedWallets)
    const addWallet = useWalletStore((state) => state.connectWallet)
    const removeWallet = useWalletStore((state) => state.disconnectWallet)

    const getWallet = () => {
        return wallets.find(wallet => SupportedNetworks.includes(wallet.network.internal_name))
    }

    const connectWallet = async (network: Layer) => {
        try {
            const res = await connect({
                argentMobileOptions: {
                    dappName: 'Layerswap',
                    projectId: WALLETCONNECT_PROJECT_ID,
                    url: 'https://www.layerswap.io/app',
                    description: 'Move crypto across exchanges, blockchains, and wallets.',
                    chainId: constants.NetworkName.SN_MAIN
                },
                dappName: 'Layerswap',
            })
            if (res && res.account && res.isConnected) {
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
        getWallet,
        connectWallet,
        disconnectWallet,
        SupportedNetworks
    }
}
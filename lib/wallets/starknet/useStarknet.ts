import { fromHex } from "viem";
import { WalletProvider } from "../../../hooks/useWallet";
import { useWalletStore } from "../../../stores/walletStore"
import KnownInternalNames from "../../knownIds"
import { constants } from "starknet";
import { connect, disconnect } from 'starknetkit'

export default function useStarknet(): WalletProvider {
    const SupportedNetworks = [KnownInternalNames.Networks.StarkNetMainnet, KnownInternalNames.Networks.StarkNetGoerli]
    const name = 'starknet'
    const WALLETCONNECT_PROJECT_ID = '28168903b2d30c75e5f7f2d71902581b';
    const wallets = useWalletStore((state) => state.connectedWallets)
    const addWallet = useWalletStore((state) => state.connectWallet)
    const removeWallet = useWalletStore((state) => state.disconnectWallet)

    const getWallet = () => {
        return wallets.find(wallet => wallet.connector === name)
    }

    const connectWallet = async (chain: string) => {
        const chainId = (chain && fromHex(chain as `0x${string}`, 'string')) ?? constants.NetworkName.SN_MAIN
        try {
            const res = await connect({
                argentMobileOptions: {
                    dappName: 'Layerswap',
                    projectId: WALLETCONNECT_PROJECT_ID,
                    url: 'https://www.layerswap.io/app',
                    description: 'Move crypto across exchanges, blockchains, and wallets.',
                    chainId: chainId as constants.NetworkName
                },
                dappName: 'Layerswap',
            })

            if (res && res.account && res.isConnected) {
                addWallet({
                    address: res.account.address,
                    chainId: res.provider.provider.chainId,
                    icon: res.icon,
                    connector: res.name,
                    providerName: name,
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

    const disconnectWallet = async () => {
        try {
            disconnect({ clearLastWallet: true })
            removeWallet(name)
        }
        catch (e) {
            console.log(e)
        }
    }

    return {
        getConnectedWallet: getWallet,
        connectWallet,
        disconnectWallet,
        SupportedNetworks,
        name
    }
}
import { WalletProvider } from "../../../hooks/useWallet";
import { useWalletStore } from "../../../stores/walletStore"
import KnownInternalNames from "../../knownIds"
import { useCallback } from "react";
import resolveWalletConnectorIcon from "../utils/resolveWalletIcon";
import toast from "react-hot-toast";

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
    const WALLETCONNECT_PROJECT_ID = '28168903b2d30c75e5f7f2d71902581b';
    const wallets = useWalletStore((state) => state.connectedWallets)

    const addWallet = useWalletStore((state) => state.connectWallet)
    const removeWallet = useWalletStore((state) => state.disconnectWallet)

    const activeWallet = wallets.find(wallet => wallet.providerName === name)

    const getWallet = () => {
        if (activeWallet) {
            return [activeWallet]
        }
        return undefined
    }

    const connectWallet = useCallback(async ({ chain }: { chain: string | undefined }) => {
        const constants = (await import('starknet')).constants
        const connect = (await import('starknetkit')).connect
        const chainId = chain === constants.StarknetChainId.SN_SEPOLIA ? constants.NetworkName.SN_SEPOLIA : constants.NetworkName.SN_MAIN
        try {
            const { wallet } = await connect({
                argentMobileOptions: {
                    dappName: 'Layerswap',
                    projectId: WALLETCONNECT_PROJECT_ID,
                    url: 'https://www.layerswap.io/app',
                    description: 'Move crypto across exchanges, blockchains, and wallets.',
                    chainId: chainId
                },
                dappName: 'Layerswap',
                modalMode: 'alwaysAsk'
            })
            if (wallet && chain && ((wallet.provider?.chainId && wallet.provider?.chainId != chain) || (wallet.provider?.provider?.chainId && wallet.provider?.provider?.chainId != chain))) {
                await disconnectWallets()
                const errorMessage = `Please switch the network in your wallet to ${chain === constants.StarknetChainId.SN_SEPOLIA ? 'Sepolia' : 'Mainnet'} and click connect again`
                throw new Error(errorMessage)
            }

            if (wallet && wallet.account && wallet.isConnected) {
                addWallet({
                    address: wallet.account.address,
                    chainId: wallet.provider?.chainId || wallet.provider?.provider?.chainId,
                    icon: resolveWalletConnectorIcon({ connector: wallet.name, address: wallet.account.address }),
                    connector: wallet.name,
                    providerName: name,
                    metadata: {
                        starknetAccount: wallet
                    },
                    isActive: true,
                    connect: () => connectWallet({ chain }),
                    disconnect: () => disconnectWallets()
                })
            } else if (wallet?.isConnected === false) {
                await disconnectWallets()
                connectWallet({ chain })
            }

        }
        catch (e) {
            console.log(e)
            toast.error(e.message, { duration: 30000 })
        }
    }, [addWallet])

    const disconnectWallets = async () => {
        const disconnect = (await import('starknetkit')).disconnect
        try {
            await disconnect({ clearLastWallet: true })
            removeWallet(name)
        }
        catch (e) {
            console.log(e)
        }
    }

    const reconnectWallet = async ({ chain }: { chain: string }) => {
        await disconnectWallets()
        await connectWallet({ chain })
    }

    return {
        connectedWallets: getWallet(),
        connectWallet,
        disconnectWallets,
        reconnectWallet,
        withdrawalSupportedNetworks,
        autofillSupportedNetworks: commonSupportedNetworks,
        asSourceSupportedNetworks: commonSupportedNetworks,
        name,
        id,
        activeWallet
    }
}
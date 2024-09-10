import { WalletProvider } from "../../../hooks/useWallet";
import { useWalletStore } from "../../../stores/walletStore"
import KnownInternalNames from "../../knownIds"
import resolveWalletConnectorIcon from "../utils/resolveWalletIcon";
import toast from "react-hot-toast";
import { useSettingsState } from "../../../context/settings";
import { useCallback } from "react";

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
    const id = 'starknet'
    const name = 'starknet'
    const { networks } = useSettingsState()

    const isMainnet = networks?.some(network => network.name === KnownInternalNames.Networks.StarkNetMainnet)

    const WALLETCONNECT_PROJECT_ID = process.env.NEXT_PUBLIC_WALLET_CONNECT_PROJECT_ID || '28168903b2d30c75e5f7f2d71902581b';
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

    const connectWallet = useCallback(async () => {
        toast.dismiss('connect-wallet')
        const constants = (await import('starknet')).constants
        const connect = (await import('starknetkit')).connect

        try {
            const { wallet } = await connect({
                argentMobileOptions: {
                    dappName: 'Layerswap',
                    projectId: WALLETCONNECT_PROJECT_ID,
                    url: 'https://www.layerswap.io/app',
                    description: 'Move crypto across exchanges, blockchains, and wallets.',
                },
                dappName: 'Layerswap',
                modalMode: 'alwaysAsk'
            })
            const walletChain = wallet && (wallet.provider?.chainId || wallet.provider?.provider?.chainId)
            const wrongChanin = walletChain == constants.StarknetChainId.SN_MAIN ? !isMainnet : isMainnet

            if (wallet && wrongChanin) {
                await disconnectWallets()
                const errorMessage = `Please switch the network in your wallet to ${isMainnet ? 'Mainnet' : 'Sepolia'} and click connect again`
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
                    connect: () => connectWallet(),
                    disconnect: () => disconnectWallets()
                })
            } else if (wallet?.isConnected === false) {
                await disconnectWallets()
                connectWallet()
            }
        }
        catch (e) {
            console.log(e)
            toast.error(e.message, { id: 'connect-wallet', duration: 30000 })
        }
    }, [addWallet, isMainnet])

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

    const reconnectWallet = async () => {
        await disconnectWallets()
        await connectWallet()
    }

    return {
        connectedWallets: getWallet(),
        activeWallet,
        connectWallet,
        disconnectWallets,
        reconnectWallet,
        withdrawalSupportedNetworks,
        autofillSupportedNetworks: commonSupportedNetworks,
        asSourceSupportedNetworks: commonSupportedNetworks,
        name,
        id,
    }
}
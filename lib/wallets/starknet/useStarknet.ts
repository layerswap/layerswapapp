import { WalletProvider } from "../../../hooks/useWallet";
import { useWalletStore } from "../../../stores/walletStore"
import KnownInternalNames from "../../knownIds"
import { useCallback } from "react";
import resolveWalletConnectorIcon from "../utils/resolveWalletIcon";
import toast from "react-hot-toast";
import { useSettingsState } from "../../../context/settings";

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

    const name = 'starknet'
    const { networks } = useSettingsState()

    const isMainnet = networks?.some(network => network.name === KnownInternalNames.Networks.StarkNetMainnet)

    const WALLETCONNECT_PROJECT_ID = process.env.NEXT_PUBLIC_WALLET_CONNECT_PROJECT_ID || '28168903b2d30c75e5f7f2d71902581b';
    const wallets = useWalletStore((state) => state.connectedWallets)

    const addWallet = useWalletStore((state) => state.connectWallet)
    const removeWallet = useWalletStore((state) => state.disconnectWallet)

    const getWallet = () => {
        return wallets.find(wallet => wallet.providerName === name)
    }

    const connectWallet = useCallback(async () => {
        toast.dismiss('connect-wallet')
        const constants = (await import('starknet')).constants
        const connect = (await import('starknetkit')).connect
        try {
            const { wallet, connectorData, connector } = await connect({
                argentMobileOptions: {
                    dappName: 'Layerswap',
                    projectId: WALLETCONNECT_PROJECT_ID,
                    url: 'https://www.layerswap.io/app',
                    description: 'Move crypto across exchanges, blockchains, and wallets.',
                },
                dappName: 'Layerswap',
                modalMode: 'alwaysAsk'
            })
            const chainId = `0x${connectorData?.chainId?.toString(16)}`

            const walletChain = wallet && chainId
            const wrongChanin = walletChain == constants.StarknetChainId.SN_MAIN ? !isMainnet : isMainnet

            if (wallet && wrongChanin) {
                await disconnectWallet()
                const errorMessage = `Please switch the network in your wallet to ${isMainnet ? 'Mainnet' : 'Sepolia'} and click connect again`
                throw new Error(errorMessage)
            }

            if (wallet && connectorData?.account && connector) {
                const account = await connector.account({})
                addWallet({
                    address: connectorData?.account,
                    chainId: chainId,
                    icon: resolveWalletConnectorIcon({ connector: wallet.name, address: connectorData?.account }),
                    connector: wallet.name,
                    providerName: name,
                    metadata: {
                        starknetAccount: account,
                        wallet: wallet
                    }
                })
            }
        }
        catch (e) {
            console.log(e)
            toast.error(e.message, { id: 'connect-wallet', duration: 30000 })
        }
    }, [addWallet, isMainnet])

    const disconnectWallet = async () => {
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
        await disconnectWallet()
        await connectWallet()
    }

    return {
        getConnectedWallet: getWallet,
        connectWallet,
        disconnectWallet,
        reconnectWallet,
        withdrawalSupportedNetworks,
        autofillSupportedNetworks: commonSupportedNetworks,
        asSourceSupportedNetworks: commonSupportedNetworks,
        name
    }
}

function extractChainId(wallet) {
    return wallet.provider?.chainId // Braavos
        || wallet.provider?.provider?.chainId // ArgentX 
        || wallet.provider?.channel?.chainId // Argent mobile
}

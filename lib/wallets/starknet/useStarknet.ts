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

        const InjectedConnector = (await import('../../../node_modules/starknetkit/dist/injectedConnector')).InjectedConnector
        const ArgentMobileConnector = (await import('../../../node_modules/starknetkit/dist/argentMobile')).ArgentMobileConnector
        const WebWalletConnector = (await import('../../../node_modules/starknetkit/dist/webwalletConnector')).WebWalletConnector

        const connect = (await import('starknetkit')).connect

        const resolveConnectors = async () => {
            const isSafari =
                typeof window !== "undefined"
                    ? /^((?!chrome|android).)*safari/i.test(navigator.userAgent)
                    : false

            const defaultConnectors: any[] = []

            if (!isSafari) {
                defaultConnectors.push(
                    new InjectedConnector({ options: { id: "argentX" } }),
                )
                defaultConnectors.push(
                    new InjectedConnector({ options: { id: "braavos" } }),
                )
                defaultConnectors.push(
                    new InjectedConnector({ options: { id: "keplr" } }),
                )
            }

            defaultConnectors.push(ArgentMobileConnector.init({
                options: {
                    dappName: 'Layerswap',
                    projectId: WALLETCONNECT_PROJECT_ID,
                    url: 'https://www.layerswap.io/app',
                    description: 'Move crypto across exchanges, blockchains, and wallets.',
                }
            }))
            defaultConnectors.push(new WebWalletConnector())

            return defaultConnectors
        }

        const connectors = await resolveConnectors()

        try {
            const { wallet, connectorData, connector } = await connect({
                dappName: 'Layerswap',
                modalMode: 'alwaysAsk',
                connectors,
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
                const starkent = networks.find(n => n.name === KnownInternalNames.Networks.StarkNetMainnet || n.name === KnownInternalNames.Networks.StarkNetSepolia)
                const WalletAccount = (await import('starknet')).WalletAccount

                const starknetWalletAccount = new WalletAccount({ nodeUrl: starkent?.node_url }, wallet);

                addWallet({
                    address: connectorData?.account,
                    chainId: chainId,
                    icon: resolveWalletConnectorIcon({ connector: wallet.name, address: connectorData?.account }),
                    connector: wallet.name,
                    providerName: name,
                    metadata: {
                        starknetAccount: starknetWalletAccount,
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

    const reconnectWallet = async () => {
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

import { useWalletStore } from "@//stores/walletStore"
import KnownInternalNames from "../../knownIds"
import { resolveWalletConnectorIcon } from "../utils/resolveWalletIcon";
import { useSettingsState } from "@//context/settings";
import { useConnect, useDisconnect } from "@starknet-react/core";
import { InternalConnector, Wallet, WalletConnectionProvider } from "@/types/wallet";
import { TransactionMessageType } from "@/components/Pages/Swap/Withdraw/messages/TransactionMessages";

const starknetNames = [KnownInternalNames.Networks.StarkNetGoerli, KnownInternalNames.Networks.StarkNetMainnet, KnownInternalNames.Networks.StarkNetSepolia]
export default function useStarknetConnection(): WalletConnectionProvider {
    const commonSupportedNetworks = [
        KnownInternalNames.Networks.StarkNetMainnet,
        KnownInternalNames.Networks.StarkNetGoerli,
        KnownInternalNames.Networks.StarkNetSepolia
    ]

    const withdrawalSupportedNetworks = [
        ...commonSupportedNetworks
    ]

    const name = 'Starknet'
    const id = 'starknet'
    const { networks } = useSettingsState()

    const { connectors } = useConnect();
    const { disconnectAsync } = useDisconnect()
    const wallets = useWalletStore((state) => state.connectedWallets)
    const addWallet = useWalletStore((state) => state.connectWallet)
    const removeWallet = useWalletStore((state) => state.disconnectWallet)

    const isMainnet = networks?.some(network => network.name === KnownInternalNames.Networks.StarkNetMainnet)

    const getWallet = () => {

        const wallet = wallets.find(wallet => wallet.providerName === name)

        if (!wallet) return

        return [wallet]
    }

    const connectWallet = async ({ connector }) => {
        try {
            const wallet = getWallet()
            if (wallet) {
                await disconnectWallets()
            }
            const starknetConnector = connectors.find(c => c.id === connector.id)

            const result = await starknetConnector?.connect({})

            const walletChain = `0x${result?.chainId?.toString(16)}`
            const wrongChanin = walletChain == '0x534e5f4d41494e' ? !isMainnet : isMainnet

            if (result?.account && wrongChanin) {
                disconnectWallets()
                const errorMessage = `Please switch the network in your wallet to ${isMainnet ? 'Mainnet' : 'Sepolia'} and click connect again`
                throw new Error(errorMessage)
            }

            if (result?.account && starknetConnector) {
                const starkent = networks.find(n => n.name === KnownInternalNames.Networks.StarkNetMainnet || n.name === KnownInternalNames.Networks.StarkNetSepolia)
                const { RpcProvider, WalletAccount } = await import('starknet')

                const rpcProvider = new RpcProvider({
                    nodeUrl: starkent?.node_url,
                })

                const starknetWalletAccount = await WalletAccount.connectSilent(rpcProvider, (starknetConnector as any).wallet);

                const wallet: Wallet = {
                    id: connector.name,
                    displayName: `${connector.name} - Starknet`,
                    address: result?.account,
                    addresses: [result?.account],
                    chainId: walletChain,
                    icon: resolveWalletConnectorIcon({ connector: connector.name, address: result?.account }),
                    providerName: name,
                    metadata: {
                        starknetAccount: starknetWalletAccount,
                        // wallet: account
                    },
                    isActive: true,
                    disconnect: () => disconnectWallets(),
                    withdrawalSupportedNetworks,
                    autofillSupportedNetworks: commonSupportedNetworks,
                    asSourceSupportedNetworks: commonSupportedNetworks,
                    networkIcon: networks.find(n => starknetNames.some(name => name === n.name))?.logo
                }

                addWallet(wallet)

                return wallet
            }
        }

        catch (e) {
            console.log(e)
            throw new Error(e)
        }
    }

    const disconnectWallets = async () => {
        try {
            await disconnectAsync()
            removeWallet(name)
        }
        catch (e) {
            console.log(e)
        }
    }

    const availableWalletsForConnect: InternalConnector[] = connectors.map(connector => {

        const name = (!connectorsConfigs.some(c => c.id === connector.id) || connector?.["_wallet"]) ? connector.name : `${connectorsConfigs.find(c => c.id === connector.id)?.name}`

        return {
            name: name,
            id: connector.id,
            icon: typeof connector.icon === 'string' ? connector.icon : (connector.icon.light.startsWith('data:') ? connector.icon.light : `data:image/svg+xml;base64,${btoa(connector.icon.light.replaceAll('currentColor', '#FFFFFF'))}`),
            type: connector?.["_wallet"] ? 'injected' : 'other',
            installUrl: connector?.["_wallet"] ? undefined : connectorsConfigs.find(c => c.id === connector.id)?.installLink,
        }
    })

    const switchAccount = async (wallet: Wallet, address: string) => {
        // as we do not have multiple accounts management we will leave the method empty
    }

    const transfer: WalletConnectionProvider['transfer'] = async (params, wallet) => {
        const { callData } = params

        try {
            const { transaction_hash: transferTxHash } = (await wallet?.metadata?.starknetAccount?.execute(JSON.parse(callData || "")) || {});

            if (transferTxHash) {
                return transferTxHash
            }
        } catch (error) {
            const e = new Error()
            e.message = error
            if (error === "An error occurred (USER_REFUSED_OP)" || error === "Execute failed") {
                e.name = TransactionMessageType.TransactionRejected
                throw e
            }
            else if (error === "failedTransfer") {
                e.name = TransactionMessageType.TransactionFailed
                throw e
            }
            else {
                e.name = TransactionMessageType.UexpectedErrorMessage
                throw e
            }
        }
    }

    const provider: WalletConnectionProvider = {
        connectWallet,
        disconnectWallets,
        switchAccount,

        transfer,

        connectedWallets: getWallet(),
        activeWallet: getWallet()?.[0],
        withdrawalSupportedNetworks,
        autofillSupportedNetworks: commonSupportedNetworks,
        asSourceSupportedNetworks: commonSupportedNetworks,
        availableWalletsForConnect,
        name,
        id,
        providerIcon: networks.find(n => starknetNames.some(name => name === n.name))?.logo,
    }

    return provider
}


const connectorsConfigs = [
    {
        id: "braavos",
        name: "Braavos",
        installLink: "https://chromewebstore.google.com/detail/braavos-starknet-wallet/jnlgamecbpmbajjfhmmmlhejkemejdma"
    },
    {
        id: "argentX",
        name: 'Argent X',
        installLink: "https://chromewebstore.google.com/detail/argent-x-starknet-wallet/dlcobpjiigpikoobohmabehhmhfoodbb"
    },
    {
        id: "keplr",
        name: 'Keplr',
        installLink: "https://chromewebstore.google.com/detail/keplr/dmkamcknogkgcdfhhbddcghachkejeap"
    }
]

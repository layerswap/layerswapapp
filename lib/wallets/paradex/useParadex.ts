import { Network } from "../../../Models/Network"
import KnownInternalNames from "../../knownIds"
import { useMemo } from "react"
import toast from "react-hot-toast"
import { LSConnector } from "../connectors/EthereumProvider"
import { InternalConnector, Wallet, WalletProvider } from "../../../Models/WalletProvider"
import { useConnectModal } from "../../../components/WalletModal"
import { type ConnectorAlreadyConnectedError } from '@wagmi/core'
import useEVM from "../evm/useEVM"
import useStarknet from "../starknet/useStarknet"
import { useWalletStore } from "../../../stores/walletStore"
import { AuthorizeStarknet } from "./Authorize/Starknet"
import { walletClientToSigner } from "../../ethersToViem/ethers"
import AuhorizeEthereum from "./Authorize/Ethereum"
import { getWalletClient } from '@wagmi/core'
import { useConfig } from "wagmi"
import { switchChain, getChainId } from '@wagmi/core'
import { useSettingsState } from "../../../context/settings"
import shortenAddress from "../../../components/utils/ShortenAddress"

type Props = {
    network: Network | undefined,
}

export default function useParadex({ network }: Props): WalletProvider {
    const name = 'paradex'
    const id = 'prdx'
    const { networks } = useSettingsState()
    const selectedProvider = useWalletStore((state) => state.selectedProveder)
    const selectProvider = useWalletStore((state) => state.selectProvider)
    const paradexAccounts = useWalletStore((state) => state.paradexAccounts)
    const addParadexAccount = useWalletStore((state) => state.addParadexAccount)
    const removeParadexAccount = useWalletStore((state) => state.removeParadexAccount)
    const paradexNetwork = networks.find(n => n.name === KnownInternalNames.Networks.ParadexMainnet || n.name === KnownInternalNames.Networks.ParadexTestnet)
    const withdrawalSupportedNetworks = [
        KnownInternalNames.Networks.ParadexMainnet,
        KnownInternalNames.Networks.ParadexTestnet,
    ]
    const autofillSupportedNetworks = [
        ...withdrawalSupportedNetworks
    ]
    const asSourceSupportedNetworks = [
        ...withdrawalSupportedNetworks
    ]
    
    const { connect, setSelectedProvider } = useConnectModal()
    const evmProvider = useEVM({ network })
    const starknetProvider = useStarknet()

    const connectWallet = async () => {
        try {
            return await connect(provider)
        }
        catch (e) {
            console.log(e)
        }
    }
    const config = useConfig()


    const connectConnector = async ({ connector }: { connector: InternalConnector & LSConnector }) => {

        try {
            setSelectedProvider({ ...provider, connector: { name: connector.name } })
            const isEvm = evmProvider.availableWalletsForConnect?.find(w => w.id === connector.id)
            const isStarknet = starknetProvider.availableWalletsForConnect?.find(w => w.id === connector.id)
            if (isEvm) {
                const connectionResult = evmProvider.connectConnector && await evmProvider.connectConnector({ connector })
                if (!connectionResult) return
                if (!paradexAccounts?.[connectionResult.address.toLowerCase()]) {
                    const l1Network = networks.find(n => n.name === KnownInternalNames.Networks.EthereumMainnet || n.name === KnownInternalNames.Networks.EthereumSepolia);
                    const l1ChainId = Number(l1Network?.chain_id)
                    if (!Number(l1ChainId)) {
                        throw Error("Could not find ethereum network")
                    }
                    const chainId = await getChainId(config)
                    if (l1ChainId !== chainId) {
                        try {
                            await sleep(1000)
                            await switchChain(config, { chainId: l1ChainId })
                        }
                        catch (e) {
                            await getChainId(config)
                            await sleep(1000)
                            const chainId = await getChainId(config)

                            if (l1ChainId !== chainId) {
                                throw Error("Could not switch to ethereum network")
                            }
                        }
                        await sleep(1000)
                    }
                    await sleep(1000)
                    const client = await getWalletClient(config)
                    const ethersSigner = walletClientToSigner(client)
                    if (!ethersSigner) {
                        throw Error("Could not initialize ethers signer")
                    }
                    const paradexAccount = await AuhorizeEthereum(ethersSigner)
                    addParadexAccount({ l1Address: connectionResult.address, paradexAddress: paradexAccount.address })
                }
                selectProvider(evmProvider.name)
                return resolveSingleWallet(connectionResult, name, paradexAccounts, removeParadexAccount, paradexNetwork?.logo)
            }
            else if (isStarknet) {
                const connectionResult = starknetProvider.connectConnector && await starknetProvider.connectConnector({ connector })
                if (!connectionResult) return
                if (!paradexAccounts?.[connectionResult.address.toLowerCase()]) {
                    const snAccount = connectionResult.metadata?.starknetAccount
                    if (!snAccount) {
                        throw Error("Starknet account not found")
                    }
                    const paradexAccount = await AuthorizeStarknet(snAccount)
                    addParadexAccount({ l1Address: connectionResult.address, paradexAddress: paradexAccount.address })
                }
                selectProvider(starknetProvider.name)
                return resolveSingleWallet(connectionResult, name, paradexAccounts, removeParadexAccount, paradexNetwork?.logo)
            }
        } catch (e) {
            //TODO: handle error like in transfer
            const error = e as ConnectorAlreadyConnectedError
            if (error.name == 'ConnectorAlreadyConnectedError') {
                toast.error('Wallet is already connected.')
            }
            else {
                toast.error(e.message)
            }
            throw new Error(e)
        }
    }

    const connectedWallets = useMemo(() => {
        return [
            ...resolveWalletsList(evmProvider.connectedWallets, paradexAccounts, name, removeParadexAccount, paradexNetwork?.logo),
            ...resolveWalletsList(starknetProvider.connectedWallets, paradexAccounts, name, removeParadexAccount, paradexNetwork?.logo)
        ]
    }, [evmProvider, starknetProvider, paradexAccounts])

    const availableWalletsForConnect = useMemo(() => {
        return [...(evmProvider.availableWalletsForConnect ? evmProvider.availableWalletsForConnect : []), ...(starknetProvider?.availableWalletsForConnect ? starknetProvider.availableWalletsForConnect : [])]
    }, [evmProvider, starknetProvider])

    const switchAccount = async (wallet: Wallet, address: string) => {
        const evmWallet = evmProvider?.connectedWallets?.find(w => w.id === wallet.id)
        const starknetWallet = starknetProvider?.connectedWallets?.find(w => w.id === wallet.id)

        if (evmWallet && evmProvider.switchAccount && wallet.metadata?.l1Address) {
            evmProvider.switchAccount(evmWallet, wallet.metadata?.l1Address)
            selectProvider(evmProvider.name)
        }
        else if (starknetWallet && starknetProvider.switchAccount && wallet.metadata?.l1Address) {
            starknetProvider.switchAccount(starknetWallet, wallet.metadata.l1Address)
            selectProvider(starknetProvider.name)
        }
    }

    const activeWallet = useMemo(() => {
        if (selectedProvider === starknetProvider.name && starknetProvider?.activeWallet) {
            return resolveSingleWallet(starknetProvider.activeWallet, name, paradexAccounts, removeParadexAccount, paradexNetwork?.logo)
        }
        else if (selectedProvider === evmProvider.name && evmProvider?.activeWallet) {
            return resolveSingleWallet(evmProvider.activeWallet, name, paradexAccounts, removeParadexAccount, paradexNetwork?.logo)
        }
    }, [evmProvider.activeWallet, starknetProvider.activeWallet, selectedProvider])

    const provider = {
        connectWallet,
        connectConnector,
        switchAccount,
        connectedWallets,
        activeWallet,
        withdrawalSupportedNetworks,
        autofillSupportedNetworks,
        asSourceSupportedNetworks,
        availableWalletsForConnect,
        name,
        id,
    }

    return provider
}

const resolveWalletsList = (wallets: Wallet[] | undefined, accounts: { [key: string]: string } | undefined, name: string, disconnect: (address: string) => void, networkIcon?: string) => {
    const l1Addresses = Object.keys(accounts || {})
    if (!l1Addresses.length || !wallets?.length) return []
    return wallets.filter(w => w.addresses.some(wa => l1Addresses.some(pa => pa.toLowerCase() === wa.toLowerCase())))
        .map(w => (resolveSingleWallet(w, name, accounts, disconnect, networkIcon))).filter(w => w) as Wallet[]
}

const resolveSingleWallet = (wallet: Wallet, name: string, accounts: { [key: string]: string } | undefined, disconnect: (address: string) => void, networkIcon?: string): Wallet | undefined => {
    const paradexAddress = accounts?.[wallet.address.toLowerCase()]
    if (!paradexAddress) return
    const displayName = `${wallet.id} (${shortenAddress(wallet.address)})`
    return {
        ...wallet,
        metadata: {
            ...wallet.metadata,
            l1Address: wallet.address
        },
        providerName: name,
        displayName,
        address: paradexAddress,
        addresses: [paradexAddress],
        disconnect: () => disconnect(wallet.address),
        networkIcon
    }
}

function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

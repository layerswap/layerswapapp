import KnownInternalNames from "../../knownIds"
import { useMemo } from "react"
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
import { Address } from "@/lib/address"
import sleep from "../utils/sleep"
import { useActiveParadexAccount } from "@/components/WalletProviders/ActiveParadexAccount"

export default function useParadex(): WalletProvider {
    const name = 'Paradex'
    const id = 'prdx'
    const { networks } = useSettingsState()
    const { activeConnection, setActiveAddress } = useActiveParadexAccount()
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

    const { setSelectedConnector } = useConnectModal()
    const evmProvider = useEVM()
    const starknetProvider = useStarknet()

    const config = useConfig()
    const starknetNetwork = networks.find(n => n.name === KnownInternalNames.Networks.StarkNetMainnet || n.name === KnownInternalNames.Networks.StarkNetGoerli || n.name === KnownInternalNames.Networks.StarkNetSepolia)
    const connectWallet = async (props?: { connector: InternalConnector }) => {
        const { connector } = props || {};
        if (!connector) {
            throw new Error("Connector is required");
        }

        try {
            setSelectedConnector(connector)
            const isEvm = evmProvider.availableWalletsForConnect?.find(w => w.id === connector.id)
            const isStarknet = starknetProvider.availableWalletsForConnect?.find(w => w.id === connector.id)

            let accounts: typeof paradexAccounts | undefined

            if (isEvm) {
                const connectionResult = evmProvider.connectWallet && await evmProvider.connectWallet({ connector })
                if (!connectionResult) return
                if (!paradexAccounts?.[connectionResult?.address?.toLowerCase()]) {
                    const l1Network = networks.find(n => n.name === KnownInternalNames.Networks.EthereumMainnet || n.name === KnownInternalNames.Networks.EthereumSepolia);
                    const l1ChainId = Number(l1Network?.chain_id)
                    if (!Number(l1ChainId)) {
                        throw Error("Could not find ethereum network")
                    }
                    let client = await getWalletClient(config)
                    const chainId = await client.getChainId()
                    if (l1ChainId !== chainId) {
                        try {
                            await sleep(1000)
                            await switchChain(config, { chainId: l1ChainId })
                        }
                        catch (e) {
                            getChainId(config)
                            await sleep(1000)
                            const chainId = getChainId(config)

                            if (l1ChainId !== chainId) {
                                throw Error("Could not switch to ethereum network")
                            }
                        }
                        await sleep(1000)
                        client = await getWalletClient(config)
                    }
                    await sleep(1000)
                    const ethersSigner = walletClientToSigner(client)
                    if (!ethersSigner) {
                        throw Error("Could not initialize ethers signer")
                    }
                    const paradexAccount = await AuhorizeEthereum(ethersSigner)
                    const paradexAddress = paradexAccount.getAddress()

                    addParadexAccount({ l1Address: connectionResult.address, paradexAddress: paradexAddress })
                    accounts = { [connectionResult.address.toLowerCase()]: paradexAddress }
                } else {
                    accounts = { [connectionResult.address.toLowerCase()]: paradexAccounts[connectionResult.address.toLowerCase()] }
                }
                setActiveAddress({
                    l1Address: connectionResult.address,
                    id: connectionResult.id,
                    providerName: "EVM"
                })
                return resolveSingleWallet({
                    provider: evmProvider,
                    walletId: connectionResult.id,
                    l1Account: connectionResult.address,
                    name,
                    paradexAccounts: accounts,
                    disconnect: removeParadexAccount,
                    networkIcon: paradexNetwork?.logo
                })
            }
            else if (isStarknet) {
                const connectionResult = starknetProvider.connectWallet && await starknetProvider.connectWallet({ connector })
                if (!connectionResult) return
                if (!paradexAccounts?.[connectionResult?.address?.toLowerCase()]) {
                    const snAccount = connectionResult.metadata?.starknetAccount
                    if (!snAccount) {
                        throw Error("Starknet account not found")
                    }
                    if (!starknetNetwork?.node_url) {
                        throw Error("Starknet node url not found")
                    }
                    const paradexAccount = await AuthorizeStarknet(snAccount as any)
                    const paradexAddress = paradexAccount.getAddress()


                    addParadexAccount({ l1Address: connectionResult.address, paradexAddress: paradexAddress })
                    accounts = { [connectionResult.address.toLowerCase()]: paradexAddress }
                }
                else {
                    accounts = { [connectionResult.address.toLowerCase()]: paradexAccounts[connectionResult.address.toLowerCase()] }
                }
                setActiveAddress({
                    l1Address: connectionResult.address,
                    id: connectionResult.id,
                    providerName: "Starknet"
                })
                return resolveSingleWallet({
                    provider: starknetProvider,
                    walletId: connectionResult.id,
                    l1Account: connectionResult.address,
                    name,
                    paradexAccounts: accounts,
                    disconnect: removeParadexAccount,
                    networkIcon: paradexNetwork?.logo
                })
            }
        } catch (e) {
            //TODO: handle error like in transfer
            const error = e as ConnectorAlreadyConnectedError
            if (error.name == 'ConnectorAlreadyConnectedError') {
                throw new Error('Wallet is already connected.')
            }
            else if (error.message.includes("Cannot read properties of undefined (reading 'toLowerCase')")) {
                throw new Error('Please update your wallet to the latest version.')
            }
            else {
                throw new Error(e.message || e)
            }
        }
    }

    const connectedWallets = useMemo(() => {
        if (!paradexAccounts) return []
        return [
            ...resolveWalletsList({ provider: evmProvider, paradexAccounts, name, disconnect: removeParadexAccount, networkIcon: paradexNetwork?.logo }),
            ...resolveWalletsList({ provider: starknetProvider, paradexAccounts, name, disconnect: removeParadexAccount, networkIcon: paradexNetwork?.logo })
        ]
    }, [evmProvider, starknetProvider, paradexAccounts])

    const availableWalletsForConnect = useMemo(() => {
        return [
            ...(evmProvider.availableWalletsForConnect ? evmProvider.availableWalletsForConnect : []),
            ...(starknetProvider?.availableWalletsForConnect ? starknetProvider.availableWalletsForConnect : [])
        ]
    }, [evmProvider, starknetProvider])

    const switchAccount = async (wallet: Wallet, address: string) => {

        const providers = [evmProvider, starknetProvider]
        const paradexProvider = providers.find(p => p?.connectedWallets?.find(w => w.id === wallet.id))
        const paradexWallet = paradexProvider?.connectedWallets?.find(w => w.id === wallet.id)

        if (paradexProvider?.name && wallet.metadata?.l1Address) {
            setActiveAddress({
                l1Address: wallet.metadata.l1Address,
                id: wallet.id,
                providerName: paradexProvider.name as "Starknet" | "EVM"
            })
            paradexProvider?.switchAccount?.(wallet, wallet.metadata.l1Address)
        }
    }

    const activeWallet = useMemo(() => {
        if (!activeConnection || !paradexAccounts) return undefined
        const provider = activeConnection?.providerName === starknetProvider.name ? starknetProvider : evmProvider
        return resolveSingleWallet({
            provider,
            walletId: activeConnection?.id,
            l1Account: activeConnection?.l1Address,
            name,
            paradexAccounts,
            disconnect: removeParadexAccount,
            networkIcon: paradexNetwork?.logo
        })
    }, [evmProvider.activeWallet, starknetProvider.activeWallet, activeConnection, paradexAccounts])

    const icon = useMemo(() => {
        return paradexNetwork?.logo
    }, [paradexNetwork])

    const provider: WalletProvider = {
        connectWallet,
        switchAccount,
        connectedWallets,
        activeWallet,
        withdrawalSupportedNetworks,
        autofillSupportedNetworks,
        asSourceSupportedNetworks,
        availableWalletsForConnect,
        name,
        id,
        providerIcon: icon,
        hideFromList: true,
        ready: evmProvider.ready && starknetProvider.ready
    }
    return provider
}
type ResolveWalletsListProps = {
    provider: WalletProvider
    paradexAccounts: { [key: string]: string }
    name: string
    disconnect: (address: string) => void
    networkIcon?: string
}
const resolveWalletsList = ({ provider, paradexAccounts, name, disconnect, networkIcon }: ResolveWalletsListProps) => {
    const l1Addresses = Object.keys(paradexAccounts || {})
    if (!l1Addresses.length || !provider.connectedWallets?.length) return []
    return provider.connectedWallets.filter(w => w.addresses.some(wa => l1Addresses.some(pa => pa.toLowerCase() === wa.toLowerCase())))
        .map(w => (resolveSingleWallet({
            provider,
            walletId: w.id,
            l1Account: w.addresses.find(wa => l1Addresses.some(pa => pa.toLowerCase() === wa.toLowerCase()))!,
            name,
            paradexAccounts,
            disconnect,
            networkIcon
        }))).filter(w => w) as Wallet[]
}

type ResolveWalletProps = {
    provider: WalletProvider
    walletId: string
    l1Account: string
    name: string
    paradexAccounts: { [key: string]: string }
    disconnect: (address: string) => void
    networkIcon?: string
}

const resolveSingleWallet = ({ provider, walletId, l1Account, name, paradexAccounts, disconnect, networkIcon }: ResolveWalletProps): Wallet | undefined => {
    const paradexAddress = paradexAccounts?.[l1Account?.toLowerCase()]
    const wallet = provider.connectedWallets?.find(w => w.id === walletId && w.addresses.some(wa => wa.toLowerCase() === l1Account.toLowerCase()))
    if (!paradexAddress || !wallet) return
    const displayName = `${wallet.id} (${new Address(l1Account, undefined, provider.name).toShortString()})`
    return {
        ...wallet,
        asSourceSupportedNetworks: [KnownInternalNames.Networks.ParadexMainnet, KnownInternalNames.Networks.ParadexTestnet],
        withdrawalSupportedNetworks: [KnownInternalNames.Networks.ParadexMainnet, KnownInternalNames.Networks.ParadexTestnet],
        autofillSupportedNetworks: [KnownInternalNames.Networks.ParadexMainnet, KnownInternalNames.Networks.ParadexTestnet],
        metadata: {
            ...wallet.metadata,
            l1Address: l1Account
        },
        providerName: name,
        displayName,
        address: paradexAddress,
        addresses: [paradexAddress],
        disconnect: () => disconnect(l1Account),
        networkIcon
    }
}
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
import shortenAddress from "../../../components/utils/ShortenAddress"
import sleep from "../utils/sleep"

export default function useParadex(): WalletProvider {
    const name = 'Paradex'
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

    const { setSelectedConnector } = useConnectModal()
    const evmProvider = useEVM()
    const starknetProvider = useStarknet()

    const config = useConfig()

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
                    addParadexAccount({ l1Address: connectionResult.address, paradexAddress: paradexAccount.address })
                    accounts = { [connectionResult.address.toLowerCase()]: paradexAccount.address }
                } else {
                    accounts = { [connectionResult.address.toLowerCase()]: paradexAccounts[connectionResult.address.toLowerCase()] }
                }
                selectProvider(evmProvider.name)

                const wallet = resolveSingleWallet(connectionResult, name, accounts, removeParadexAccount, paradexNetwork?.logo)
                return wallet
            }
            else if (isStarknet) {
                const connectionResult = starknetProvider.connectWallet && await starknetProvider.connectWallet({ connector })
                if (!connectionResult) return
                if (!paradexAccounts?.[connectionResult?.address?.toLowerCase()]) {
                    const snAccount = connectionResult.metadata?.starknetAccount
                    if (!snAccount) {
                        throw Error("Starknet account not found")
                    }
                    const paradexAccount = await AuthorizeStarknet(snAccount)
                    addParadexAccount({ l1Address: connectionResult.address, paradexAddress: paradexAccount.address })
                    accounts = { [connectionResult.address.toLowerCase()]: paradexAccount.address }
                }
                else {
                    accounts = { [connectionResult.address.toLowerCase()]: paradexAccounts[connectionResult.address.toLowerCase()] }
                }
                selectProvider(starknetProvider.name)
                return resolveSingleWallet(connectionResult, name, accounts, removeParadexAccount, paradexNetwork?.logo)
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
        return [
            ...resolveWalletsList(evmProvider.connectedWallets, paradexAccounts, name, removeParadexAccount, paradexNetwork?.logo),
            ...resolveWalletsList(starknetProvider.connectedWallets, paradexAccounts, name, removeParadexAccount, paradexNetwork?.logo)
        ]
    }, [evmProvider, starknetProvider, paradexAccounts])

    const availableWalletsForConnect = useMemo(() => {
        return [...(evmProvider.availableWalletsForConnect ? evmProvider.availableWalletsForConnect : []), ...(starknetProvider?.availableWalletsForConnect ? starknetProvider.availableWalletsForConnect : [])]
    }, [evmProvider, starknetProvider])

    const switchAccount = async (wallet: Wallet, address: string) => {
        const providers = [evmProvider, starknetProvider]
        const paradexProvider = providers.find(p => p?.connectedWallets?.find(w => w.id === wallet.id))
        const paradexWallet = paradexProvider?.connectedWallets?.find(w => w.id === wallet.id)
        
        if (paradexProvider?.switchAccount && paradexWallet && wallet.metadata?.l1Address)
            paradexProvider.switchAccount(paradexWallet, wallet.metadata?.l1Address)
        if (paradexProvider?.name)
            selectProvider(paradexProvider.name)
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
        switchAccount,
        connectedWallets,
        activeWallet,
        withdrawalSupportedNetworks,
        autofillSupportedNetworks,
        asSourceSupportedNetworks,
        availableWalletsForConnect,
        name,
        id,
        hideFromList: true
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
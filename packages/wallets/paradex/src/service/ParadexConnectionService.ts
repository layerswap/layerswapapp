import type { NetworkWithTokens } from "@layerswap/utils"
import type { InternalConnector, RequestAdditionalConnectorsParams, RequestAdditionalConnectorsResult, Wallet, WalletConnectionProvider } from "@layerswap/wallet-core/types"
import { sleep } from "@layerswap/utils"
import { getRegistryEntry } from "@layerswap/wallet-core"
import { KnownInternalNames } from "@layerswap/utils";
import { Address } from "@layerswap/utils"
import { getEvmConfig, walletClientToSigner } from '@layerswap/wallet-evm'
import {
    getChainId,
    getWalletClient,
    switchChain,
    type ConnectorAlreadyConnectedError,
} from '@wagmi/core'
import { useParadexActiveStore, type ParadexAccount } from './paradexActiveStore'
import { paradexAccountStore, type ParadexAccountMap } from './paradexAccountStore'
import { name, paradexNames } from '../constants'

export { name, id } from '../constants'

export const withdrawalSupportedNetworks = [...paradexNames]
export const autofillSupportedNetworks = [...withdrawalSupportedNetworks]
export const asSourceSupportedNetworks = [...withdrawalSupportedNetworks]

type Account = ParadexAccount

type RuntimeDeps = {
    setSelectedConnector?: (connector: unknown) => void
    getProviderById?: (id: string) => WalletConnectionProvider | undefined
}

const EMPTY_PROVIDER: WalletConnectionProvider = {
    connectWallet: () => undefined,
    connectedWallets: undefined,
    activeWallet: undefined,
    withdrawalSupportedNetworks: [],
    name: '',
    id: '',
    ready: false,
}

type ResolveSingleWalletProps = {
    provider: WalletConnectionProvider
    walletId: string
    l1Account: string
    paradexAccounts: ParadexAccountMap
    networkIcon?: string
}

type ResolveWalletsListProps = {
    provider: WalletConnectionProvider
    paradexAccounts: ParadexAccountMap
    networkIcon?: string
}

export class ParadexConnectionService {
    private _networks: NetworkWithTokens[] = []
    private _networksKey = ''
    private _deps: RuntimeDeps = {}

    setNetworks(networks: NetworkWithTokens[]): void {
        const key = networks.map(n => n.name).join('|')
        if (this._networksKey === key) return
        this._networks = networks
        this._networksKey = key
    }

    configure(deps: RuntimeDeps): void {
        this._deps = { ...this._deps, ...deps }
    }

    private getEvmProvider(): WalletConnectionProvider {
        return this._deps.getProviderById?.('evm') ?? EMPTY_PROVIDER
    }

    private getStarknetProvider(): WalletConnectionProvider {
        return this._deps.getProviderById?.('starknet') ?? EMPTY_PROVIDER
    }

    private getParadexAccounts(): ParadexAccountMap {
        return paradexAccountStore.getState().paradexAccounts
    }

    private addParadexAccount(payload: { l1Address: string; paradexAddress: string }): void {
        paradexAccountStore.getState().addParadexAccount(payload)
    }

    private removeParadexAccount(address: string): void {
        paradexAccountStore.getState().removeParadexAccount(address)
    }

    private getSelectedAccount(): Account | undefined {
        return useParadexActiveStore.getState().selectedAccount
    }

    private setSelectedAccount(account: Account | undefined): void {
        useParadexActiveStore.getState().setSelectedAccount(account)
    }

    getActiveConnection(): Account | undefined {
        const paradexAccounts = this.getParadexAccounts()
        if (!paradexAccounts) return undefined
        const l1Addresses = Object.keys(paradexAccounts)
        const evmProvider = this.getEvmProvider()
        const starknetProvider = this.getStarknetProvider()
        const selected = this.getSelectedAccount()
        const selectedProvider = selected
            ? (selected.providerName === 'EVM' ? evmProvider : starknetProvider)
            : undefined
        const selectedAvailable = selected
            && selectedProvider?.connectedWallets?.some(w =>
                w.id === selected.id
                && w.addresses.some(wa => wa.toLowerCase() === selected.l1Address.toLowerCase()),
            )
        if (selectedAvailable) return selected

        const evmWallet = evmProvider.connectedWallets?.find(w =>
            w.addresses.some(wa => l1Addresses.some(pa => pa.toLowerCase() === wa.toLowerCase())),
        )
        const starknetWallet = starknetProvider.connectedWallets?.find(w =>
            w.addresses.some(wa => l1Addresses.some(pa => pa.toLowerCase() === wa.toLowerCase())),
        )
        const defaultWallet = evmWallet || starknetWallet
        if (!defaultWallet) return undefined
        return {
            id: defaultWallet.id,
            providerName: defaultWallet.providerName as 'Starknet' | 'EVM',
            l1Address: defaultWallet.addresses.find(wa =>
                l1Addresses.some(pa => pa.toLowerCase() === wa.toLowerCase()),
            )!,
        }
    }

    getParadexNetwork(): NetworkWithTokens | undefined {
        return this._networks.find(n =>
            n.name === KnownInternalNames.Networks.ParadexMainnet
            || n.name === KnownInternalNames.Networks.ParadexTestnet,
        )
    }

    getStarknetNetwork(): NetworkWithTokens | undefined {
        return this._networks.find(n =>
            n.name === KnownInternalNames.Networks.StarkNetMainnet
            || n.name === KnownInternalNames.Networks.StarkNetGoerli
            || n.name === KnownInternalNames.Networks.StarkNetSepolia,
        )
    }

    getEvmNetwork(): NetworkWithTokens | undefined {
        return this._networks.find(n =>
            n.name === KnownInternalNames.Networks.EthereumMainnet
            || n.name === KnownInternalNames.Networks.EthereumSepolia,
        )
    }

    getProviderIcon(): string | undefined {
        return this.getParadexNetwork()?.logo
    }

    getAvailableConnectors(): InternalConnector[] {
        const evmProvider = this.getEvmProvider()
        const starknetProvider = this.getStarknetProvider()
        return [
            ...(evmProvider?.availableConnectors ?? []),
            ...(starknetProvider?.availableConnectors ?? []),
        ]
    }

    getAdditionalConnectors(): InternalConnector[] {
        return this.getEvmProvider()?.additionalConnectors ?? []
    }

    isReady(): boolean {
        const evmProvider = this.getEvmProvider()
        const starknetProvider = this.getStarknetProvider()
        const evmReady = typeof evmProvider?.ready === 'boolean' ? evmProvider.ready : true
        const starknetReady = typeof starknetProvider?.ready === 'boolean' ? starknetProvider.ready : true
        return evmReady && starknetReady
    }

    private resolveSingleWallet({
        provider,
        walletId,
        l1Account,
        paradexAccounts,
        networkIcon,
    }: ResolveSingleWalletProps): Wallet | undefined {
        const paradexAddress = paradexAccounts?.[l1Account?.toLowerCase()]
        if (!paradexAddress) return undefined

        // The mapping is persisted in localStorage; a tampered/corrupted entry
        // must never be used to derive the trading account. Paradex addresses are
        // Starknet field elements (0x + up to 64 hex chars) — reject anything else
        // and drop the bad entry so it isn't retried.
        const isValidParadexAddress = /^0x[0-9a-fA-F]{1,64}$/.test(paradexAddress)
        if (!isValidParadexAddress) {
            console.error(`[Paradex] Address integrity check failed for ${l1Account}; removing entry`)
            this.removeParadexAccount(l1Account)
            return undefined
        }

        const wallet = provider.connectedWallets?.find(w =>
            w.id === walletId && w.addresses.some(wa => wa.toLowerCase() === l1Account.toLowerCase()),
        )
        if (!wallet) return undefined
        const displayName = `${wallet.id} (${new Address(l1Account, undefined, provider.name).toShortString()})`
        return {
            ...wallet,
            // Paradex transactions execute on a derived account, not directly
            // on the backing L1 wallet's connected chain.
            chainId: undefined,
            asSourceSupportedNetworks,
            withdrawalSupportedNetworks,
            autofillSupportedNetworks,
            metadata: {
                ...wallet.metadata,
                l1Address: l1Account,
                l1ProviderName: provider.name,
                l1ChainId: provider.name === 'EVM' ? this.getEvmNetwork()?.chain_id ?? undefined : undefined,
            },
            providerName: name,
            displayName,
            address: paradexAddress,
            addresses: [paradexAddress],
            disconnect: () => this.removeParadexAccount(l1Account),
            networkIcon,
        }
    }

    private resolveWalletsList({ provider, paradexAccounts, networkIcon }: ResolveWalletsListProps): Wallet[] {
        const l1Addresses = Object.keys(paradexAccounts || {})
        if (!l1Addresses.length || !provider.connectedWallets?.length) return []
        return provider.connectedWallets
            .filter(w => w.addresses.some(wa => l1Addresses.some(pa => pa.toLowerCase() === wa.toLowerCase())))
            .map(w => this.resolveSingleWallet({
                provider,
                walletId: w.id,
                l1Account: w.addresses.find(wa => l1Addresses.some(pa => pa.toLowerCase() === wa.toLowerCase()))!,
                paradexAccounts,
                networkIcon,
            }))
            .filter(Boolean) as Wallet[]
    }

    getConnectedWallets(): Wallet[] {
        const paradexAccounts = this.getParadexAccounts()
        const evmProvider = this.getEvmProvider()
        const starknetProvider = this.getStarknetProvider()
        if (!paradexAccounts) return []
        const networkIcon = this.getParadexNetwork()?.logo
        return [
            ...this.resolveWalletsList({ provider: evmProvider, paradexAccounts, networkIcon }),
            ...this.resolveWalletsList({ provider: starknetProvider, paradexAccounts, networkIcon }),
        ]
    }

    getActiveWallet(): Wallet | undefined {
        const activeConnection = this.getActiveConnection()
        const paradexAccounts = this.getParadexAccounts()
        const evmProvider = this.getEvmProvider()
        const starknetProvider = this.getStarknetProvider()
        if (!activeConnection || !paradexAccounts) return undefined
        const provider = activeConnection.providerName === starknetProvider.name ? starknetProvider : evmProvider
        return this.resolveSingleWallet({
            provider,
            walletId: activeConnection.id,
            l1Account: activeConnection.l1Address,
            paradexAccounts,
            networkIcon: this.getParadexNetwork()?.logo,
        })
    }

    async connectWallet(props?: { connector: InternalConnector }): Promise<Wallet | undefined> {
        const { connector } = props || {}
        if (!connector) throw new Error('Connector is required')

        const { setSelectedConnector } = this._deps
        const evmProvider = this.getEvmProvider()
        const starknetProvider = this.getStarknetProvider()
        const existingAccounts = this.getParadexAccounts()

        if (!evmProvider || !starknetProvider) {
            throw new Error('EVM/Starknet providers not configured')
        }

        try {
            setSelectedConnector?.(connector)
            const isRegistryEvmConnector = !!getRegistryEntry(connector)
            const isEvm = isRegistryEvmConnector
                || evmProvider.availableConnectors?.find(w => w.id === connector.id)
                || evmProvider.additionalConnectors?.find(w => w.id === connector.id)
            const isStarknet = starknetProvider.availableConnectors?.find(w => w.id === connector.id)

            const networkIcon = this.getParadexNetwork()?.logo
            let accounts: ParadexAccountMap | undefined

            if (isEvm) {
                const connectionResult = evmProvider.connectWallet && await evmProvider.connectWallet({ connector })
                if (!connectionResult) return
                if (!existingAccounts?.[connectionResult.address?.toLowerCase()]) {
                    const l1Network = this.getEvmNetwork()
                    const l1ChainId = Number(l1Network?.chain_id)
                    if (!Number(l1ChainId)) throw Error('Could not find ethereum network')

                    const config = getEvmConfig()
                    let client = await getWalletClient(config)
                    const chainId = await client.getChainId()
                    if (l1ChainId !== chainId) {
                        try {
                            await sleep(1000)
                            await switchChain(config, { chainId: l1ChainId })
                        } catch (e) {
                            getChainId(config)
                            await sleep(1000)
                            const newChainId = getChainId(config)
                            if (l1ChainId !== newChainId) throw Error('Could not switch to ethereum network')
                        }
                        await sleep(1000)
                        client = await getWalletClient(config)
                    }
                    await sleep(1000)
                    const ethersSigner = walletClientToSigner(client)
                    if (!ethersSigner) throw Error('Could not initialize ethers signer')

                    const { default: authorizeEthereum } = await import('../Authorize/Ethereum')
                    const paradexAccount = await authorizeEthereum(ethersSigner)
                    const paradexAddress = paradexAccount.getAddress()

                    this.addParadexAccount({ l1Address: connectionResult.address, paradexAddress })
                    accounts = { [connectionResult.address.toLowerCase()]: paradexAddress }
                } else {
                    accounts = { [connectionResult.address.toLowerCase()]: existingAccounts[connectionResult.address.toLowerCase()] }
                }
                this.setSelectedAccount({
                    l1Address: connectionResult.address,
                    id: connectionResult.id,
                    providerName: 'EVM',
                })
                return this.resolveSingleWallet({
                    provider: evmProvider,
                    walletId: connectionResult.id,
                    l1Account: connectionResult.address,
                    paradexAccounts: accounts!,
                    networkIcon,
                })
            } else if (isStarknet) {
                const connectionResult = starknetProvider.connectWallet && await starknetProvider.connectWallet({ connector })
                if (!connectionResult) return
                const snAccount = connectionResult.metadata?.starknetAccount
                if (!existingAccounts?.[connectionResult.address?.toLowerCase()]) {
                    if (!snAccount) throw Error('Starknet account not found')
                    const starknetNetwork = this.getStarknetNetwork()
                    if (!starknetNetwork?.node_url) throw Error('Starknet node url not found')

                    const { AuthorizeStarknet } = await import('../Authorize/Starknet')
                    const paradexAccount = await AuthorizeStarknet(snAccount as any)
                    const paradexAddress = paradexAccount.getAddress()

                    this.addParadexAccount({ l1Address: connectionResult.address, paradexAddress })
                    accounts = { [connectionResult.address.toLowerCase()]: paradexAddress }
                } else {
                    accounts = { [connectionResult.address.toLowerCase()]: existingAccounts[connectionResult.address.toLowerCase()] }
                }
                this.setSelectedAccount({
                    l1Address: connectionResult.address,
                    id: connectionResult.id,
                    providerName: 'Starknet',
                })
                return this.resolveSingleWallet({
                    provider: starknetProvider,
                    walletId: connectionResult.id,
                    l1Account: connectionResult.address,
                    paradexAccounts: accounts!,
                    networkIcon,
                })
            }
        } catch (e: any) {
            const error = e as ConnectorAlreadyConnectedError
            if (error?.name === 'ConnectorAlreadyConnectedError') {
                throw new Error('Wallet is already connected.')
            } else if (error?.message?.includes("Cannot read properties of undefined (reading 'toLowerCase')")) {
                throw new Error('Please update your wallet to the latest version.')
            } else {
                throw new Error(e?.message || e)
            }
        }
    }

    async switchAccount(wallet: Wallet, _address: string): Promise<void> {
        const evmProvider = this.getEvmProvider()
        const starknetProvider = this.getStarknetProvider()
        const providers = [evmProvider, starknetProvider]
        const paradexProvider = providers.find(p => p?.connectedWallets?.find(w => w.id === wallet.id))
        if (paradexProvider?.name && wallet.metadata?.l1Address) {
            this.setSelectedAccount({
                l1Address: wallet.metadata.l1Address,
                id: wallet.id,
                providerName: paradexProvider.name as 'Starknet' | 'EVM',
            })
            paradexProvider?.switchAccount?.(wallet, wallet.metadata.l1Address)
        }
    }

    async requestAdditionalConnectors(params: RequestAdditionalConnectorsParams = {}): Promise<RequestAdditionalConnectorsResult> {
        const evmProvider = this.getEvmProvider()
        if (!evmProvider?.requestAdditionalConnectors) {
            return { connectors: [], nextPage: null, totalCount: 0 }
        }
        const result = await evmProvider.requestAdditionalConnectors(params)
        return {
            connectors: result.connectors.map(connector => ({ ...connector, providerName: name })),
            nextPage: result.nextPage,
            totalCount: result.totalCount,
        }
    }
}

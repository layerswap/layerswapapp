import { type InternalConnector, type Wallet } from '@layerswap/widget-types';
import type { RequestAdditionalConnectorsParams, RequestAdditionalConnectorsResult, WalletConnectionProvider, WalletConnectionService } from "@layerswap/wallet-core/types";
import { KnownInternalNames, sleep } from "@layerswap/utils"
import { isWalletConnectRegistryConnector, type AppNetworkAdapter } from "@layerswap/wallet-core"
import { Address } from "@layerswap/utils"
import { getEvmConfig, walletClientToSigner } from '@layerswap/wallet-evm'
import { getChainId, getWalletClient, switchChain, type ConnectorAlreadyConnectedError, } from '@wagmi/core'
import type { ParadexAccount } from './paradexActiveStore'
import { ParadexAccountMapper, type ParadexAccountMap } from './ParadexAccountMapper'
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

/**
 * Connection/flow orchestration for Paradex: coordinates the backing
 * EVM/Starknet providers and drives the Paradex SDK authorization flows.
 * L1 ↔ Paradex account bookkeeping lives in {@link ParadexAccountMapper}.
 */
export class ParadexConnectionService<Network> implements WalletConnectionService<RuntimeDeps, Network> {
    private _networks: Network[] = []
    private _networkAdapter: AppNetworkAdapter<Network> | undefined
    private _networksKey = ''
    private _deps: RuntimeDeps = {}
    private readonly _accounts = new ParadexAccountMapper()

    setNetworks(networks: Network[], networkAdapter: AppNetworkAdapter<Network>): void {
        const key = networks.map(network => networkAdapter.getId(network)).join('|')
        if (this._networksKey === key) return
        this._networks = networks
        this._networkAdapter = networkAdapter
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

    getActiveConnection(): Account | undefined {
        return this._accounts.resolveActiveConnection(this.getEvmProvider(), this.getStarknetProvider())
    }

    getParadexNetwork(): Network | undefined {
        return this._networks.find(network =>
            this._networkAdapter && paradexNames.includes(this._networkAdapter.getId(network))
        )
    }

    getStarknetNetwork(): Network | undefined {
        return this._networks.find(network => {
            if (!this._networkAdapter) return false
            const id = this._networkAdapter.getId(network)
            return id === KnownInternalNames.Networks.StarkNetMainnet
                || id === KnownInternalNames.Networks.StarkNetGoerli
                || id === KnownInternalNames.Networks.StarkNetSepolia
        })
    }

    getEvmNetwork(): Network | undefined {
        return this._networks.find(network => {
            if (!this._networkAdapter) return false
            const id = this._networkAdapter.getId(network)
            return id === KnownInternalNames.Networks.EthereumMainnet
                || id === KnownInternalNames.Networks.EthereumSepolia
        })
    }

    getProviderIcon(): string | undefined {
        const network = this.getParadexNetwork()
        return network && this._networkAdapter ? this._networkAdapter.getIcon(network) : undefined
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
        const paradexAddress = this._accounts.findParadexAddress(l1Account, paradexAccounts)
        if (!paradexAddress) return undefined

        const wallet = provider.connectedWallets?.find(w =>
            w.id === walletId && w.addresses.some(wa => wa.toLowerCase() === l1Account.toLowerCase()),
        )
        if (!wallet) return undefined
        const displayName = `${wallet.id} (${new Address(l1Account, undefined, provider.name).toShortString()})`
        const evmNetwork = this.getEvmNetwork()
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
                l1ChainId: provider.name === 'EVM' && evmNetwork
                    ? this._networkAdapter?.getChainId(evmNetwork) ?? undefined
                    : undefined,
            },
            providerName: name,
            displayName,
            address: paradexAddress,
            addresses: [paradexAddress],
            disconnect: () => this._accounts.removeAccount(l1Account),
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
        const paradexAccounts = this._accounts.getAccounts()
        const evmProvider = this.getEvmProvider()
        const starknetProvider = this.getStarknetProvider()
        if (!paradexAccounts) return []
        const networkIcon = this.getProviderIcon()
        return [
            ...this.resolveWalletsList({ provider: evmProvider, paradexAccounts, networkIcon }),
            ...this.resolveWalletsList({ provider: starknetProvider, paradexAccounts, networkIcon }),
        ]
    }

    getActiveWallet(): Wallet | undefined {
        const activeConnection = this.getActiveConnection()
        const paradexAccounts = this._accounts.getAccounts()
        const evmProvider = this.getEvmProvider()
        const starknetProvider = this.getStarknetProvider()
        if (!activeConnection || !paradexAccounts) return undefined
        const provider = activeConnection.providerName === starknetProvider.name ? starknetProvider : evmProvider
        return this.resolveSingleWallet({
            provider,
            walletId: activeConnection.id,
            l1Account: activeConnection.l1Address,
            paradexAccounts,
            networkIcon: this.getProviderIcon(),
        })
    }

    async connectWallet(props?: { connector: InternalConnector }): Promise<Wallet | undefined> {
        const { connector } = props || {}
        if (!connector) throw new Error('Connector is required')

        const { setSelectedConnector } = this._deps
        const evmProvider = this.getEvmProvider()
        const starknetProvider = this.getStarknetProvider()
        const existingAccounts = this._accounts.getAccounts()

        if (!evmProvider || !starknetProvider) {
            throw new Error('EVM/Starknet providers not configured')
        }

        try {
            setSelectedConnector?.(connector)
            const isRegistryEvmConnector = isWalletConnectRegistryConnector(connector)
            const isEvm = isRegistryEvmConnector
                || evmProvider.availableConnectors?.find(w => w.id === connector.id)
                || evmProvider.additionalConnectors?.find(w => w.id === connector.id)
            const isStarknet = starknetProvider.availableConnectors?.find(w => w.id === connector.id)

            const networkIcon = this.getProviderIcon()
            let accounts: ParadexAccountMap | undefined

            if (isEvm) {
                const connectionResult = evmProvider.connectWallet && await evmProvider.connectWallet({ connector })
                if (!connectionResult) return
                if (!existingAccounts?.[connectionResult.address?.toLowerCase()]) {
                    const l1Network = this.getEvmNetwork()
                    const l1ChainId = Number(l1Network && this._networkAdapter?.getChainId(l1Network))
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

                    this._accounts.addAccount({ l1Address: connectionResult.address, paradexAddress })
                    accounts = { [connectionResult.address.toLowerCase()]: paradexAddress }
                } else {
                    accounts = { [connectionResult.address.toLowerCase()]: existingAccounts[connectionResult.address.toLowerCase()] }
                }
                this._accounts.setSelectedAccount({
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
                    if (!starknetNetwork || !this._networkAdapter?.getRpcUrls(starknetNetwork)[0]) throw Error('Starknet node url not found')

                    const { AuthorizeStarknet } = await import('../Authorize/Starknet')
                    const paradexAccount = await AuthorizeStarknet(snAccount as any)
                    const paradexAddress = paradexAccount.getAddress()

                    this._accounts.addAccount({ l1Address: connectionResult.address, paradexAddress })
                    accounts = { [connectionResult.address.toLowerCase()]: paradexAddress }
                } else {
                    accounts = { [connectionResult.address.toLowerCase()]: existingAccounts[connectionResult.address.toLowerCase()] }
                }
                this._accounts.setSelectedAccount({
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
            this._accounts.setSelectedAccount({
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

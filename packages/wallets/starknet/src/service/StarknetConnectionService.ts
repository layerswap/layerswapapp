import type {
    InternalConnector,
    NetworkWithTokens,
    Wallet,
    WalletConnectionProvider,
} from '@layerswap/widget/types'
import { KnownInternalNames, walletIconResolver } from '@layerswap/widget/internal'
import type { Connector } from '@starknet-react/core'
import { name as PROVIDER_NAME, id as PROVIDER_ID, starknetNames } from '../constants'
import { resolveStarknetWalletIcon } from '../utils'
import { starknetConnectorManager } from './starknetConnectorManager'
import { useStarknetStore } from './starknetStore'

const connectorsConfigs = [
    {
        id: 'braavos',
        name: 'Braavos',
        installLink: 'https://chromewebstore.google.com/detail/braavos-starknet-wallet/jnlgamecbpmbajjfhmmmlhejkemejdma',
    },
    {
        id: 'argentX',
        name: 'Ready X',
        installLink: 'https://chromewebstore.google.com/detail/argent-x-starknet-wallet/dlcobpjiigpikoobohmabehhmhfoodbb',
    },
    {
        id: 'keplr',
        name: 'Keplr',
        installLink: 'https://chromewebstore.google.com/detail/keplr/dmkamcknogkgcdfhhbddcghachkejeap',
    },
    {
        id: 'xverse',
        name: 'Xverse Wallet',
        installLink: 'https://chromewebstore.google.com/detail/xverse-bitcoin-crypto-wal/idnnbdplmphpflfnlkomgpfbpcgelopg',
    },
]

type ResolveStarknetWalletProps = {
    name: string
    connector: Connector
    network: NetworkWithTokens | undefined
    disconnectWallets: () => Promise<void>
    address: string
    withdrawalSupportedNetworks: string[]
    autofillSupportedNetworks?: string[]
    asSourceSupportedNetworks?: string[]
}

export async function resolveStarknetWallet(props: ResolveStarknetWalletProps): Promise<Wallet | null> {
    const { name, connector, network, disconnectWallets, address, withdrawalSupportedNetworks, autofillSupportedNetworks, asSourceSupportedNetworks } = props
    try {
        const walletChain = network?.chain_id
        const { RpcProvider, WalletAccount } = await import('starknet')
        const rpcProvider = new RpcProvider({ nodeUrl: network?.node_url })

        const walletAccount = new WalletAccount({ provider: rpcProvider, walletProvider: (connector as any).wallet, address })

        const accounts = await walletAccount.requestAccounts(true)
        const account = accounts?.[0]

        const configuredName = connectorsConfigs.find(c => c.id === connector.id)?.name
        const connectorName = configuredName ?? connector.name

        const wallet: Wallet = {
            id: connectorName,
            displayName: `${connectorName} - Starknet`,
            address: account,
            addresses: [account],
            chainId: walletChain || '',
            icon: walletIconResolver(address, resolveStarknetWalletIcon({ icon: connector.icon })),
            providerName: name,
            metadata: {
                starknetAccount: walletAccount,
            },
            isActive: true,
            withdrawalSupportedNetworks,
            disconnect: () => disconnectWallets(),
            networkIcon: starknetNames.includes(network?.name || '') ? network?.logo : undefined,
            autofillSupportedNetworks,
            asSourceSupportedNetworks,
        }

        return wallet
    } catch (e) {
        console.warn(`Failed to initialize wallet for ${connector.name}:`, e)
        return null
    }
}

type RuntimeDeps = {
    isMainnet?: boolean
}

export class StarknetConnectionService {
    private _networks: NetworkWithTokens[] = []
    private _networksKey = ''
    private _deps: RuntimeDeps = {}
    private _restoreTimer: number | undefined
    private _restoringStoredWallets = false
    private _restoreAttempts = 0
    private readonly _maxRestoreAttempts = 20

    setNetworks(networks: NetworkWithTokens[]): void {
        const key = networks.map(n => n.name).join('|')
        if (this._networksKey === key) return
        this._networks = networks
        this._deps.isMainnet = networks?.some(network => network.name === KnownInternalNames.Networks.StarkNetMainnet)
        this._networksKey = key
        this.requestStoredWalletHydration()
    }

    getStarknetNetwork(): NetworkWithTokens | undefined {
        return this._networks.find(n =>
            n.name === KnownInternalNames.Networks.StarkNetMainnet
            || n.name === KnownInternalNames.Networks.StarkNetSepolia
            || n.name === KnownInternalNames.Networks.StarkNetGoerli,
        )
    }

    getProviderIcon(): string | undefined {
        return this._networks.find(n => starknetNames.some(name => name === n.name))?.logo
    }

    private connectorIsAvailable(connector: Connector): boolean {
        try {
            return typeof (connector as any).available !== 'function'
                || Boolean((connector as any).available())
        } catch {
            return false
        }
    }

    private hasPendingStoredWallets(): boolean {
        const state = useStarknetStore.getState()
        const connectedAddresses = new Set(state.connectedWallets.map(wallet => wallet.address.toLowerCase()))
        return Object.values(state.starknetAccounts || {}).some(address =>
            !connectedAddresses.has(address.toLowerCase()),
        )
    }

    /**
     * Drops persisted Starknet accounts that we've repeatedly failed to
     * resolve back to a connected wallet (e.g. the user switched accounts in
     * the wallet, or the stored connector is no longer available). Without
     * this they would stay "pending" forever and keep the retry loop alive.
     */
    private clearStalePendingWallets(): void {
        const state = useStarknetStore.getState()
        const connectedAddresses = new Set(state.connectedWallets.map(wallet => wallet.address.toLowerCase()))
        const stale = Object.values(state.starknetAccounts || {}).filter(
            address => !connectedAddresses.has(address.toLowerCase()),
        )
        for (const address of stale) state.removeAccount(address)
    }

    requestStoredWalletHydration(): void {
        if (typeof window === 'undefined' || this._restoreTimer || this._restoringStoredWallets) return

        // Fresh trigger (e.g. networks just changed): allow a new bounded run.
        this._restoreAttempts = 0

        const attemptHydration = async (): Promise<void> => {
            this._restoreTimer = undefined
            if (!this.hasPendingStoredWallets()) {
                this._restoreAttempts = 0
                return
            }

            if (this.getStarknetNetwork()) {
                this._restoringStoredWallets = true
                try {
                    await this.hydrateStoredWallets()
                } finally {
                    this._restoringStoredWallets = false
                }
            }

            if (!this.hasPendingStoredWallets()) {
                this._restoreAttempts = 0
                return
            }

            // Still pending after this attempt. Bound the retry so a stale or
            // unresolvable persisted account can't wake the page every 500ms
            // for its entire lifetime. After the cap, drop the stale entries.
            this._restoreAttempts += 1
            if (this._restoreAttempts >= this._maxRestoreAttempts) {
                this.clearStalePendingWallets()
                this._restoreAttempts = 0
                return
            }

            this._restoreTimer = window.setTimeout(() => {
                void attemptHydration()
            }, 500)
        }

        this._restoreTimer = window.setTimeout(() => {
            void attemptHydration()
        }, 0)
    }

    dispose(): void {
        if (this._restoreTimer) {
            window.clearTimeout(this._restoreTimer)
            this._restoreTimer = undefined
        }
        this._restoringStoredWallets = false
    }

    getAvailableConnectors(): InternalConnector[] {
        const connectors = useStarknetStore.getState().connectors
        return connectors.map(connector => {
            const config = connectorsConfigs.find(c => c.id === connector.id)
            const displayName = config?.name ?? connector.name
            const realConnector = starknetConnectorManager.getConnector(connector.id)
            let isInjectedAndAvailable = false
            try {
                isInjectedAndAvailable = !!config
                    && typeof (realConnector as any)?.available === 'function'
                    && (realConnector as any).available()
            } catch {
                isInjectedAndAvailable = false
            }
            return {
                name: displayName,
                id: connector.id,
                icon: resolveStarknetWalletIcon({ icon: connector.icon }),
                type: isInjectedAndAvailable ? 'injected' : 'other',
                installUrl: config?.installLink,
                extensionNotFound: !!config?.installLink && !isInjectedAndAvailable,
                providerName: displayName,
            }
        })
    }

    async disconnectWallets(_connectorName?: string, address?: string): Promise<void> {
        try {
            await starknetConnectorManager.disconnectAll()
            if (address) useStarknetStore.getState().removeAccount(address)
        } catch (e) {
            // TODO: handle error
            console.log(e)
        }
    }

    async connectWallet({ connector }: { connector: InternalConnector }): Promise<Wallet | undefined> {
        const starknetConnector = starknetConnectorManager.getConnector(connector.id)
        if (!starknetConnector) throw new Error('Connector not found')

        let result = await starknetConnector.connect({})

        const walletChain = `0x${result?.chainId?.toString(16)}`
        const isWalletOnMainnet = walletChain === '0x534e5f4d41494e'
        const isMainnet = this._deps.isMainnet ?? false
        const wrongChain = isWalletOnMainnet !== isMainnet
        const starknetNetwork = this.getStarknetNetwork()
        if (!starknetNetwork) throw new Error('Starknet network not found')

        if (result?.account && wrongChain) {
            const wallet = (starknetConnector as any)?._wallet || (starknetConnector as any)?.wallet
            if (wallet?.request) {
                const targetChainId = isMainnet ? 'SN_MAIN' : 'SN_SEPOLIA'
                try {
                    await wallet.request({
                        type: 'wallet_switchStarknetChain',
                        params: { chainId: targetChainId },
                    })
                    result = await starknetConnector.connect({})
                } catch (switchError) {
                    console.log('Chain switch failed:', switchError)
                    await this.disconnectWallets(connector?.name, result?.account)
                    throw new Error(`Failed to switch network. Please switch manually to ${isMainnet ? 'Mainnet' : 'Sepolia'} in your wallet.`)
                }
            } else {
                await this.disconnectWallets(connector?.name, result?.account)
                throw new Error(`Please switch the network in your wallet to ${isMainnet ? 'Mainnet' : 'Sepolia'} and connect again.`)
            }
        }

        if (!result?.account) return undefined

        const store = useStarknetStore.getState()
        const resolvedWallet = await resolveStarknetWallet({
            name: PROVIDER_NAME,
            connector: starknetConnector,
            network: starknetNetwork,
            disconnectWallets: () => this.disconnectWallets(starknetConnector.id, result?.account),
            address: result.account,
            withdrawalSupportedNetworks: starknetNames,
            autofillSupportedNetworks: starknetNames,
            asSourceSupportedNetworks: starknetNames,
        })

        store.addAccount(starknetConnector.id, result.account)
        if (resolvedWallet) {
            store.connectWallet(resolvedWallet)
            store.setActiveWallet(resolvedWallet.address)
            return resolvedWallet
        }
        return undefined
    }

    async switchAccount(_wallet: Wallet, address: string): Promise<void> {
        useStarknetStore.getState().setActiveWallet(address)
    }

    async hydrateStoredWallets(): Promise<void> {
        const store = useStarknetStore.getState()
        const starknetAccounts = store.starknetAccounts || {}
        if (Object.keys(starknetAccounts).length === 0) return

        const starknetNetwork = this.getStarknetNetwork()
        if (!starknetNetwork) return
        const connectors = starknetConnectorManager.getConnectors()

        for (const connector of connectors) {
            const address = starknetAccounts[connector.id]
            if (!address || !this.connectorIsAvailable(connector)) continue
            const wallet = await resolveStarknetWallet({
                name: PROVIDER_NAME,
                connector,
                network: starknetNetwork,
                disconnectWallets: () => starknetConnectorManager.disconnectAll().then(() => useStarknetStore.getState().removeAccount(address)),
                withdrawalSupportedNetworks: starknetNames,
                autofillSupportedNetworks: starknetNames,
                asSourceSupportedNetworks: starknetNames,
                address,
            })
            if (wallet?.address) {
                useStarknetStore.getState().connectWallet(wallet)
            }
        }
    }

    buildProvider(): WalletConnectionProvider {
        const { connectedWallets, activeWalletAddress } = useStarknetStore.getState()
        const activeWallet = connectedWallets.find(wallet => wallet.address === activeWalletAddress)

        return {
            connectWallet: this.connectWallet.bind(this),
            switchAccount: this.switchAccount.bind(this),

            connectedWallets,
            activeWallet,
            withdrawalSupportedNetworks: starknetNames,
            autofillSupportedNetworks: starknetNames,
            asSourceSupportedNetworks: starknetNames,
            availableConnectors: this.getAvailableConnectors(),
            name: PROVIDER_NAME,
            id: PROVIDER_ID,
            providerIcon: this.getProviderIcon(),
            ready: useStarknetStore.getState().ready,
        }
    }
}

export const starknetConnectionService = new StarknetConnectionService()

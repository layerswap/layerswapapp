import { type InternalConnector, type Wallet } from '@layerswap/widget-types';
import type { WalletConnectionProvider, WalletConnectionService, WalletModalConnector } from "@layerswap/ui-kit/types";
import { walletIconResolver, type AppNetworkAdapter } from "@layerswap/ui-kit";
import {
    connect,
    disconnect,
    getConnectors,
    type Connector,
} from '@bigmi/client'
import { name as PROVIDER_NAME, id as PROVIDER_ID } from '../constants'
import { isBitcoinAddressValid } from '../utils/isValidAddress'
import { getBitcoinConfig, hasBitcoinConfig } from './getBitcoinConfig'
import { useBitcoinStore } from './bitcoinStore'

type ConnectorSelection = { selectedConnector: WalletModalConnector | undefined }

type RuntimeDeps = {
    setSelectedConnector?: (connector: unknown) => void
}

export class BitcoinConnectionService<Network> implements WalletConnectionService<RuntimeDeps, Network> {
    private _networks: Network[] = []
    private _networkAdapter: AppNetworkAdapter<Network> | undefined
    private _networksKey = ''
    private _deps: RuntimeDeps = {}

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

    getCommonSupportedNetworks(): string[] {
        return this._networks
            .filter(network => this._networkAdapter?.isBitcoinNetwork(network))
            .map(network => this._networkAdapter?.getId(network))
            .filter((id): id is string => !!id)
    }

    getProviderIcon(): string | undefined {
        const supported = this.getCommonSupportedNetworks()
        const network = this._networks.find(item => supported.includes(this._networkAdapter?.getId(item) ?? ''))
        return network && this._networkAdapter ? this._networkAdapter.getIcon(network) : undefined
    }

    getNetworkIcon(): string | undefined {
        return this.getProviderIcon()
    }

    getAvailableConnectors(): InternalConnector[] {
        return [...useBitcoinStore.getState().resolvedConnectors]
    }

    private resolveWallet(connector: Connector | undefined, address: string | undefined): Wallet | undefined {
        if (!connector || !address) return undefined
        const supported = this.getCommonSupportedNetworks()
        const wallet: Wallet = {
            id: connector.name,
            internalId: connector.id,
            isActive: true,
            address,
            addresses: [address],
            displayName: `${connector.name} - Bitcoin`,
            providerName: PROVIDER_NAME,
            icon: walletIconResolver(address, connector.icon),
            disconnect: () => this.disconnectWallets(),
            asSourceSupportedNetworks: supported,
            autofillSupportedNetworks: supported,
            withdrawalSupportedNetworks: supported,
            networkIcon: this.getNetworkIcon(),
        }
        return wallet
    }

    getConnectedWallets(): Wallet[] {
        if (!hasBitcoinConfig()) return []
        const account = useBitcoinStore.getState().account
        if (!account.address || !account.connectorId) return []
        const config = getBitcoinConfig()
        const connector = getConnectors(config).find(c => c.id === account.connectorId)
        const wallet = this.resolveWallet(connector, account.address)
        return wallet ? [wallet] : []
    }

    async disconnectWallets(): Promise<void> {
        const config = getBitcoinConfig()
        // Disconnect only live connections; some connectors leave stale bigmi
        // state behind, so force-reset it afterwards.
        for (const connection of config.state.connections.values()) {
            const connector = getConnectors(config).find(c => c.id === connection.connector.id)
            if (connector) await disconnect(config, { connector }).catch(console.log)
        }
        if (config.state.connections.size > 0) {
            config.setState(x => ({ ...x, connections: new Map(), current: null, status: 'disconnected' }))
        }
    }

    async connectWallet({ connector: internalConnector }: { connector: InternalConnector }): Promise<Wallet | undefined> {
        const config = getBitcoinConfig()
        const setSelectedConnector = this._deps.setSelectedConnector
        try {
            const connector = getConnectors(config).find(w => w.id === internalConnector.id)
            if (!connector) throw new Error('Connector not found')

            const iconString = typeof connector.icon === 'string' ? connector.icon : undefined
            setSelectedConnector?.({ ...internalConnector, icon: iconString })

            await this.disconnectWallets()

            const result = await connect(config, { connector })
            if (!result.accounts) throw new Error('No result from connector')

            const address = result.accounts[0].address
            const supported = this.getCommonSupportedNetworks()
            const network = this._networks.find(item => supported.includes(this._networkAdapter?.getId(item) ?? ''))
            if (!network) throw new Error('Network not found')

            const networkId = this._networkAdapter?.getId(network).toLowerCase() ?? ''
            const isTestnet = networkId.includes('testnet') || networkId.includes('signet')
            if (address && !isBitcoinAddressValid(address, isTestnet)) {
                await disconnect(config, { connector })
                throw new Error(`Please switch the network in your wallet to ${isTestnet ? 'Testnet' : 'Mainnet'} and click connect again`)
            }

            return this.resolveWallet(connector, address)
        } catch (e: any) {
            if (e?.name === 'ConnectorAlreadyConnectedError') {
                throw new Error('Wallet is already connected')
            }
            throw new Error((e?.shortMessage || e?.message || 'Wallet connection failed').replace(`${e?.name}: `, '').trim())
        }
    }

    buildProvider(): WalletConnectionProvider {
        const connectedWallets = this.getConnectedWallets()
        const activeWallet = connectedWallets[0]
        const supported = this.getCommonSupportedNetworks()

        return {
            connectWallet: this.connectWallet.bind(this),
            disconnectWallets: this.disconnectWallets.bind(this),

            connectedWallets,
            activeWallet,
            availableConnectors: this.getAvailableConnectors(),
            autofillSupportedNetworks: supported,
            withdrawalSupportedNetworks: supported,
            asSourceSupportedNetworks: supported,
            name: PROVIDER_NAME,
            id: PROVIDER_ID,
            providerIcon: this.getProviderIcon(),
            unsupportedPlatforms: ['mobile'],
            ready: useBitcoinStore.getState().ready,
        }
    }
}

export type { ConnectorSelection }

import type {
    InternalConnector,
    NetworkWithTokens,
    Wallet,
    WalletConnectionProvider,
} from '@layerswap/widget/types'
import {
    KnownInternalNames,
    walletIconResolver,
} from '@layerswap/widget/internal'
import {
    connect,
    disconnect,
    getAccount,
    getConnectors,
    type Connector,
} from '@bigmi/client'
import { NetworkType } from '@layerswap/widget/types'
import { name as PROVIDER_NAME, id as PROVIDER_ID, bitcoinNames } from '../constants'
import { isBitcoinAddressValid } from '../utils/isValidAddress'
import { getBitcoinConfig } from './getBitcoinConfig'
import { useBitcoinStore } from './bitcoinStore'

type ConnectorSelection = { selectedConnector: unknown }

type RuntimeDeps = {
    setSelectedConnector?: (connector: unknown) => void
}

export class BitcoinConnectionService {
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

    getCommonSupportedNetworks(): string[] {
        return this._networks
            .filter(network => network.type === NetworkType.Bitcoin)
            .map(l => l.name)
    }

    getProviderIcon(): string | undefined {
        const supported = this.getCommonSupportedNetworks()
        return this._networks.find(n => supported.some(name => name === n.name))?.logo
    }

    getNetworkIcon(): string | undefined {
        return this._networks.find(n => bitcoinNames.some(name => name === n.name))?.logo
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
            disconnect: () => this.disconnectWallet(connector.name),
            asSourceSupportedNetworks: supported,
            autofillSupportedNetworks: supported,
            withdrawalSupportedNetworks: supported,
            networkIcon: this.getNetworkIcon(),
        }
        return wallet
    }

    getConnectedWallets(): Wallet[] {
        const config = getBitcoinConfig()
        const account = useBitcoinStore.getState().account
        if (!account.address || !account.connectorId) return []
        const connector = getConnectors(config).find(c => c.id === account.connectorId)
        const wallet = this.resolveWallet(connector, account.address)
        return wallet ? [wallet] : []
    }

    async disconnectWallet(connectorName: string): Promise<void> {
        try {
            const config = getBitcoinConfig()
            const connector = getConnectors(config).find(c => c.name.toLowerCase() === connectorName.toLowerCase())
            await disconnect(config, { connector })
        } catch (e) {
            // TODO: handle error
            console.log(e)
        }
    }

    async disconnectWallets(): Promise<void> {
        try {
            const config = getBitcoinConfig()
            await Promise.all(
                getConnectors(config).map((connector) => disconnect(config, { connector })),
            )
        } catch (e) {
            // TODO: handle error
            console.log(e)
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

            if (getAccount(config).account) {
                await disconnect(config, { connector })
            }

            const result = await connect(config, { connector })
            if (!result.accounts) throw new Error('No result from connector')

            const address = result.accounts[0].address
            const supported = this.getCommonSupportedNetworks()
            const network = this._networks.find(n => supported.includes(n.name))
            if (!network) throw new Error('Network not found')

            if (address && !isBitcoinAddressValid(address, network)) {
                await disconnect(config, { connector })
                const isMainnet = network.name === KnownInternalNames.Networks.BitcoinMainnet
                throw new Error(`Please switch the network in your wallet to ${isMainnet ? 'Mainnet' : 'Testnet'} and click connect again`)
            }

            return this.resolveWallet(connector, address)
        } catch (e: any) {
            if (e?.name === 'ConnectorAlreadyConnectedError') {
                throw new Error('Wallet is already connected')
            }
            throw new Error(e?.message || e)
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

export const bitcoinConnectionService = new BitcoinConnectionService()
export type { ConnectorSelection }

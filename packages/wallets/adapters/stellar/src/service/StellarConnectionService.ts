import type { InternalConnector, Wallet } from '@layerswap/widget-types'
import type { WalletConnectionProvider, WalletConnectionService } from '@layerswap/wallet-core/types'
import { walletIconResolver, type AppNetworkAdapter } from '@layerswap/wallet-core'
import { id as PROVIDER_ID, name as PROVIDER_NAME } from '../constants'
import { stellarKitManager } from './stellarKitManager'
import { stellarStore, type StellarWalletSnapshot } from './stellarStore'
import { toStellarConnector } from './stellarConnector'

export class StellarConnectionService<Network> implements WalletConnectionService<never, Network> {
    private networks: Network[] = []
    private networkAdapter: AppNetworkAdapter<Network> | undefined
    private networksKey = ''

    setNetworks(networks: Network[], networkAdapter: AppNetworkAdapter<Network>): void {
        const key = networks.map(network => networkAdapter.getId(network)).join('|')
        if (this.networksKey === key) return
        this.networks = networks
        this.networkAdapter = networkAdapter
        this.networksKey = key
    }

    getAvailableConnectors(): InternalConnector[] {
        return stellarStore.getState().wallets.map(toStellarConnector)
    }

    getConnectedWallets(): Wallet[] {
        const { wallets, activeWalletId, activeAddress } = stellarStore.getState()
        if (!activeWalletId || !activeAddress) return []
        const snapshot = wallets.find(wallet => wallet.id === activeWalletId)
        if (!snapshot) return []
        return [this.resolveWallet(snapshot, activeAddress)]
    }

    async connectWallet({ connector }: { connector: InternalConnector }): Promise<Wallet | undefined> {
        const wallet = stellarStore.getState().wallets.find(item => item.id === connector.id)
        if (!wallet) throw new Error('Stellar wallet connector not found')
        const { address } = await stellarKitManager.connect(wallet.id)
        return this.resolveWallet(wallet, address)
    }

    async disconnectWallets(): Promise<void> {
        await stellarKitManager.disconnect()
    }

    buildProvider(): WalletConnectionProvider {
        const connectedWallets = this.getConnectedWallets()
        const activeWallet = connectedWallets[0]
        const supportedNetworks = this.getSupportedNetworks()
        const networkLogo = this.getNetworkLogo()
        return {
            connectWallet: this.connectWallet.bind(this),
            disconnectWallets: this.disconnectWallets.bind(this),
            availableConnectors: this.getAvailableConnectors(),
            connectedWallets,
            activeWallet,
            autofillSupportedNetworks: supportedNetworks,
            withdrawalSupportedNetworks: supportedNetworks,
            asSourceSupportedNetworks: supportedNetworks,
            name: PROVIDER_NAME,
            id: PROVIDER_ID,
            providerIcon: networkLogo,
            ready: stellarStore.getState().ready,
        }
    }

    private resolveWallet(snapshot: StellarWalletSnapshot, address: string): Wallet {
        const supportedNetworks = this.getSupportedNetworks()
        return {
            id: snapshot.id,
            address,
            addresses: [address],
            displayName: `${snapshot.name} - Stellar`,
            providerName: PROVIDER_NAME,
            isActive: true,
            icon: walletIconResolver(address, snapshot.icon),
            networkIcon: this.getNetworkLogo(),
            disconnect: () => this.disconnectWallets(),
            autofillSupportedNetworks: supportedNetworks,
            withdrawalSupportedNetworks: supportedNetworks,
            asSourceSupportedNetworks: supportedNetworks,
        }
    }

    private getNetworkLogo(): string | undefined {
        const network = this.networks.find(item => this.networkAdapter?.isStellarNetwork(item))
        return network && this.networkAdapter ? this.networkAdapter.getIcon(network) : undefined
    }

    private getSupportedNetworks(): string[] {
        if (!this.networkAdapter) return []
        return this.networks
            .filter(network => this.networkAdapter?.isStellarNetwork(network))
            .map(network => this.networkAdapter!.getId(network))
    }
}

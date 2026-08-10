import { type InternalConnector, type Wallet } from '@layerswap/widget-types';
import type { WalletConnectionProvider, WalletConnectionService, WalletModalConnector } from "@layerswap/ui-kit/types";
import { walletIconResolver, getEip6963Providers, walletKey, type AppNetworkAdapter } from "@layerswap/ui-kit"
import { name as PROVIDER_NAME, id as PROVIDER_ID } from '../constants'
import { tronAdapterManager } from './tronAdapterManager'
import { type TronWalletSnapshot, useTronStore } from './tronStore'

export class TronConnectionService<Network> implements WalletConnectionService<never, Network> {
    private _networks: Network[] = []
    private _networkAdapter: AppNetworkAdapter<Network> | undefined
    private _networksKey = ''

    setNetworks(networks: Network[], networkAdapter: AppNetworkAdapter<Network>): void {
        const key = networks.map(network => networkAdapter.getId(network)).join('|')
        if (this._networksKey === key) return
        this._networks = networks
        this._networkAdapter = networkAdapter
        this._networksKey = key
    }

    getNetworkLogo(): string | undefined {
        const network = this._networks.find(item => this._networkAdapter?.isTronNetwork(item))
        return network && this._networkAdapter ? this._networkAdapter.getIcon(network) : undefined
    }

    getProviderIcon(): string | undefined {
        return this.getNetworkLogo()
    }

    getAvailableConnectors(): InternalConnector[] {
        const wallets = useTronStore.getState().wallets
        return wallets.map(wallet => {
            const adapterName = wallet.name
            const isLoading = wallet.state === 'Loading'
            const eip6963Providers = getEip6963Providers()
            const isMetaMaskMissing = adapterName === 'MetaMask' && !eip6963Providers.some(provider => provider.info.rdns === 'io.metamask')
            const isTronLinkMissing = adapterName === 'TronLink' && !eip6963Providers.some(provider => provider.info.rdns === 'org.tronlink.www')
            const isNotInstalled = wallet.state === 'NotFound' || isMetaMaskMissing || isTronLinkMissing

            return {
                id: adapterName,
                name: adapterName,
                icon: wallet.icon,
                type: isNotInstalled ? 'other' : 'injected',
                installUrl: wallet.url,
                extensionNotFound: isNotInstalled,
                isLoadable: isLoading,
                providerName: PROVIDER_NAME,
            }
        })
    }

    resolveWallet(snapshot: TronWalletSnapshot | undefined, address: string | undefined): Wallet | undefined {
        if (!snapshot || !address) return undefined
        return {
            id: snapshot.name,
            address,
            addresses: [address],
            displayName: `${snapshot.name} - Tron`,
            networkIcon: this.getNetworkLogo(),
            providerName: PROVIDER_NAME,
            isActive: true,
            icon: walletIconResolver(address, snapshot.icon),
            disconnect: () => this.disconnectWallets(),
            autofillSupportedNetworks: this.getSupportedNetworks(),
            withdrawalSupportedNetworks: this.getSupportedNetworks(),
            asSourceSupportedNetworks: this.getSupportedNetworks(),
        }
    }

    getConnectedWallets(): Wallet[] {
        const { wallets, activeWalletName, activeAddress } = useTronStore.getState()
        if (!activeWalletName || !activeAddress) return []
        const snapshot = wallets.find(w => w.name === activeWalletName)
        const resolved = this.resolveWallet(snapshot, activeAddress)
        return resolved ? [resolved] : []
    }

    async connectWallet({ connector }: { connector: WalletModalConnector }): Promise<Wallet | undefined> {
        const { wallets } = useTronStore.getState()
        const target = wallets.find(w => w.name === connector.id)
            ?? wallets.find(w => walletKey(w.name) === walletKey(connector.name))
        if (!target) throw new Error('Connector not found')

        try {
            tronAdapterManager.select(target.name)
            await tronAdapterManager.connect()

            const connectedAdapter = tronAdapterManager.getConnectedAdapter()
            const { wallets: updatedWallets } = useTronStore.getState()
            const snapshot = updatedWallets.find(w => w.name === connectedAdapter?.name) ?? target
            return this.resolveWallet(snapshot, connectedAdapter?.address ?? undefined)
        } catch (e: any) {
            throw new Error(e?.message || e)
        }
    }

    async disconnectWallets(): Promise<void> {
        try {
            await tronAdapterManager.disconnect()
        } catch (e) {
            // Disconnect is best-effort — log but do not rethrow.
            const msg = e instanceof Error ? e.message : String(e)
            console.error(`[TRON] Failed to disconnect wallet: ${msg}`)
        }
    }

    buildProvider(): WalletConnectionProvider {
        const connectedWallets = this.getConnectedWallets()
        const activeWallet = connectedWallets[0]
        const availableConnectors = this.getAvailableConnectors()

        return {
            connectWallet: this.connectWallet.bind(this),
            disconnectWallets: this.disconnectWallets.bind(this),

            availableConnectors,
            connectedWallets,
            activeWallet,
            autofillSupportedNetworks: this.getSupportedNetworks(),
            withdrawalSupportedNetworks: this.getSupportedNetworks(),
            asSourceSupportedNetworks: this.getSupportedNetworks(),
            name: PROVIDER_NAME,
            id: PROVIDER_ID,
            providerIcon: this.getProviderIcon(),
            ready: useTronStore.getState().ready,
        }
    }

    private getSupportedNetworks(): string[] {
        return this._networkAdapter
            ? this._networks.filter(network => this._networkAdapter?.isTronNetwork(network)).map(network => this._networkAdapter!.getId(network))
            : []
    }
}

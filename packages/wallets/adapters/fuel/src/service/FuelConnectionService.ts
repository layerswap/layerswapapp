import { type InternalConnector, type Wallet } from '@layerswap/widget-types';
import type { EnsureWalletChainOptions, WalletConnectionProvider, WalletConnectionService } from "@layerswap/wallet-core/types";
import type { AppNetworkAdapter } from "@layerswap/wallet-core"
import { sleep } from "@layerswap/utils"
import type { FuelConnector } from '@fuel-ts/account'
import { Address } from '@fuel-ts/address'
import { name as PROVIDER_NAME, id as PROVIDER_ID } from '../constants'
import { BAKO_STATE } from '../connectors/bako-safe/Bako'
import { resolveFuelWalletConnectorIcon } from '../utils'
import { useFuelStore } from './fuelStore'
import { resolveFuelChainId, type KnownFuelNetwork } from './resolveFuelChainId'
import { ensureFuelChain } from './ensureFuelChain'

export class FuelConnectionService<Network> implements WalletConnectionService<never, Network> {
    // All services share the wallet store. An older account query must not
    // overwrite a newer permissions snapshot, even from another widget.
    private static _walletSyncVersion = 0
    private _networks: Network[] = []
    private _networkAdapter: AppNetworkAdapter<Network> | undefined
    // `connectWallet` mutates the module-global `BAKO_STATE.{state.last_req,
    // period_durtion}` while connecting. Rapid double-clicks or a retry firing
    // while a connect is still in flight would interleave those writes. Chain
    // connects through this promise so they run one-at-a-time.
    private _connectQueue: Promise<unknown> = Promise.resolve()

    setNetworks(networks: Network[], networkAdapter: AppNetworkAdapter<Network>): void {
        // RPC URLs can change even when the configured network IDs stay the same.
        this._networks = networks
        this._networkAdapter = networkAdapter
    }

    private getKnownNetworks(): KnownFuelNetwork[] {
        const adapter = this._networkAdapter
        if (!adapter) {
            return []
        }
        return this._networks.filter(network => adapter.isFuelNetwork(network)).map(network => ({
            chainId: adapter.getChainId(network),
            rpcUrls: adapter.getRpcUrls(network),
        }))
    }

    private addWallet(wallet: Wallet): void {
        FuelConnectionService._walletSyncVersion++
        useFuelStore.getState().connectWallet(wallet)
    }

    private removeWallet(connectorName?: string): void {
        FuelConnectionService._walletSyncVersion++
        useFuelStore.getState().disconnectWallet(connectorName)
    }

    private getConnectedWallets(): Wallet[] {
        return useFuelStore.getState().connectedWallets
    }

    private getSupportedNetworks(): string[] {
        return this._networks
            .filter(network => this._networkAdapter?.isFuelNetwork(network))
            .map(network => this._networkAdapter?.getId(network))
            .filter((id): id is string => !!id)
    }

    getNetworkIcon(): string | undefined {
        const network = this._networks.find(item => this._networkAdapter?.isFuelNetwork(item))
        return network && this._networkAdapter ? this._networkAdapter.getIcon(network) : undefined
    }

    // Connector icons come either as a URL string or as a { dark, light } pair
    // of raw SVG markup; the latter is wrapped as a base64 data URL unless it
    // already is one. Shared by getAvailableConnectors and resolveFuelWallet.
    private resolveConnectorImageIcon(
        image: string | { dark: string; light: string } | undefined
    ): string | undefined {
        if (!image) return undefined
        if (typeof image === 'string') return image
        return image.dark.startsWith('data:')
            ? image.dark
            : `data:image/svg+xml;base64,${btoa(image.dark)}`
    }

    getAvailableConnectors(): InternalConnector[] {
        const connectors = useFuelStore.getState().connectors
        return connectors.map(c => {
            const icon = this.resolveConnectorImageIcon(c.metadata.image)
            const isInstalled = c.installed && !c['dAppWindow']
            const isLoadable = c.metadata?.install?.action !== 'Install'
            return {
                name: c.name,
                id: c.name,
                icon,
                type: isInstalled ? 'injected' : 'other',
                installUrl: c.metadata.install.link,
                extensionNotFound: !c.installed,
                isLoadable,
                providerName: PROVIDER_NAME,
            }
        })
    }

    async resolveFuelWallet(connector: FuelConnector, address: string, addresses: string[]): Promise<Wallet> {
        const network = await connector.currentNetwork()
        const chainId = resolveFuelChainId(network, this.getKnownNetworks())
        const icon = this.resolveConnectorImageIcon(connector.metadata.image)

        return {
            id: connector.name,
            address,
            addresses,
            isActive: true,
            chainId,
            disconnect: () => this.disconnectWallet(connector.name),
            displayName: `${connector.name} - Fuel`,
            providerName: PROVIDER_NAME,
            icon: resolveFuelWalletConnectorIcon({ connector: connector.name, address, iconUrl: icon }),
            autofillSupportedNetworks: this.getSupportedNetworks(),
            withdrawalSupportedNetworks: this.getSupportedNetworks(),
            asSourceSupportedNetworks: this.getSupportedNetworks(),
            networkIcon: this.getNetworkIcon(),
        }
    }

    connectWallet({ connector }: { connector: InternalConnector }): Promise<Wallet | undefined> {
        // Serialize against any in-flight connect (see `_connectQueue`). The
        // `.then(run, run)` runs `run` whether the prior connect resolved or
        // rejected, so one failure doesn't wedge the queue.
        const run = () => this.doConnectWallet({ connector })
        const result = this._connectQueue.then(run, run)
        this._connectQueue = result.catch(() => { })
        return result
    }

    private async doConnectWallet({ connector }: { connector: InternalConnector }): Promise<Wallet | undefined> {
        const attemptConnection = async (isRetry: boolean = false): Promise<Wallet | undefined> => {
            try {
                const fuelConnector = useFuelStore.getState().connectors.find(w => w.name === connector.name)
                BAKO_STATE.state.last_req = undefined
                BAKO_STATE.period_durtion = 120_000
                await fuelConnector?.connect()

                const addresses = (await fuelConnector?.accounts())?.map(a => new Address(a).toB256())
                if (!addresses?.length || !fuelConnector) return undefined

                const result = await this.resolveFuelWallet(fuelConnector, addresses[0], addresses)
                this.addWallet(result)
                await this.switchAccount(result)
                return result
            } catch (e) {
                if (connector.name === 'Bako Safe' && e === false && !isRetry) {
                    console.log('Bako Safe connection failed with false, retrying once...')
                    await sleep(1000)
                    return await attemptConnection(true)
                }
                throw e instanceof Error ? e : new Error(typeof e === 'string' ? e : JSON.stringify(e))
            }
        }
        return attemptConnection()
    }

    async disconnectWallet(connectorName: string): Promise<void> {
        try {
            const fuelConnector = useFuelStore.getState().connectors.find(c => c.name === connectorName)
            if (!fuelConnector) throw new Error('Connector not found')
            await fuelConnector.disconnect()
        } catch (e) {
            // Disconnect is best-effort — log but do not rethrow; the wallet is
            // removed from the store in `finally` regardless.
            const msg = e instanceof Error ? e.message : String(e)
            console.error(`[Fuel] Failed to disconnect ${connectorName}: ${msg}`)
        } finally {
            this.removeWallet(connectorName)
        }
    }

    async disconnectWallets(): Promise<void> {
        try {
            BAKO_STATE.state.last_req = undefined
            BAKO_STATE.period_durtion = 10_000
            const connectors = useFuelStore.getState().connectors
            for (const connector of connectors.filter(c => c.connected)) {
                await connector.disconnect()
                this.removeWallet()
            }
        } catch (e) {
            // Best-effort bulk disconnect — log but do not rethrow.
            const msg = e instanceof Error ? e.message : String(e)
            console.error(`[Fuel] Failed to disconnect wallets: ${msg}`)
        }
    }

    async switchAccount(wallet: Wallet): Promise<void> {
        try {
            const fuel = useFuelStore.getState().fuel
            if (!fuel) throw new Error('Fuel instance not available')
            const res = await fuel.selectConnector(wallet.id)
            if (!res) throw new Error('Could not switch account')
        } catch (e) {
            const msg = e instanceof Error ? e.message : String(e)
            console.error(`[Fuel] Failed to switch account to ${wallet.id}: ${msg}`)
        }
    }

    async switchChain(wallet: Wallet, chainId: string | number): Promise<void> {
        await this.ensureChain(wallet, chainId)
    }

    async ensureChain(wallet: Wallet, chainId: string | number, options: EnsureWalletChainOptions = {}): Promise<void> {
        const connector = useFuelStore.getState().connectors.find(c => c.name === wallet.id)
        if (!connector) {
            throw new Error('Fuel connector not found')
        }
        await ensureFuelChain({ ...options, connector, chainId, knownNetworks: this.getKnownNetworks() })
    }

    async resolveConnectedWallets(): Promise<Wallet[]> {
        const { connectors, connectedWallets } = useFuelStore.getState()
        const lastKnownWallets = new Map(connectedWallets.map(wallet => [wallet.id, wallet]))
        const wallets: Wallet[] = []
        for (const connector of connectors.filter(c => c.connected)) {
            const lastKnownWallet = lastKnownWallets.get(connector.name)
            let addresses: string[]
            try {
                addresses = (await connector.accounts()).map(a => new Address(a).toB256())
            } catch (e) {
                const msg = e instanceof Error ? e.message : String(e)
                console.error(`[Fuel] Failed to query accounts for ${connector.name}: ${msg}`)
                // Keep the full snapshot only when account permissions are unknown.
                if (connector.connected && lastKnownWallet) wallets.push(lastKnownWallet)
                continue
            }
            if (!connector.connected || addresses.length === 0) continue

            try {
                const w = await this.resolveFuelWallet(connector, addresses[0], addresses)
                if (connector.connected) wallets.push(w)
            } catch (e) {
                const msg = e instanceof Error ? e.message : String(e)
                console.error(`[Fuel] Failed to resolve connected wallet for ${connector.name}: ${msg}`)
                // Preserve cached network metadata, but always apply confirmed permissions.
                if (connector.connected && lastKnownWallet) {
                    wallets.push({ ...lastKnownWallet, address: addresses[0], addresses })
                }
            }
        }
        return wallets
    }

    async syncConnectedWallets(): Promise<void> {
        const version = ++FuelConnectionService._walletSyncVersion
        const wallets = await this.resolveConnectedWallets()
        if (version === FuelConnectionService._walletSyncVersion) {
            useFuelStore.getState()._setConnectedWallets(wallets)
        }
    }

    buildProvider(): WalletConnectionProvider {
        const connectedWallets = this.getConnectedWallets()
        return {
            connectWallet: this.connectWallet.bind(this),
            disconnectWallets: this.disconnectWallets.bind(this),
            switchAccount: this.switchAccount.bind(this),
            switchChain: this.switchChain.bind(this),
            ensureChain: this.ensureChain.bind(this),

            availableConnectors: this.getAvailableConnectors(),
            autofillSupportedNetworks: this.getSupportedNetworks(),
            withdrawalSupportedNetworks: this.getSupportedNetworks(),
            asSourceSupportedNetworks: this.getSupportedNetworks(),
            activeWallet: connectedWallets[0],
            connectedWallets,
            name: PROVIDER_NAME,
            id: PROVIDER_ID,
            ready: useFuelStore.getState().ready,
        }
    }
}

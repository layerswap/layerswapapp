import type {
    InternalConnector,
    NetworkWithTokens,
    Wallet,
    WalletConnectionProvider,
} from '@layerswap/widget/types'
import { sleep, useWalletStore } from '@layerswap/widget/internal'
import type { FuelConnector } from '@fuel-ts/account'
import { Address } from '@fuel-ts/address'
import { name as PROVIDER_NAME, id as PROVIDER_ID, commonSupportedNetworks } from '../constants'
import { BAKO_STATE } from '../connectors/bako-safe/Bako'
import { resolveFuelWalletConnectorIcon } from '../utils'
import { useFuelStore } from './fuelStore'

export class FuelConnectionService {
    private _networks: NetworkWithTokens[] = []
    private _networksKey = ''
    // `connectWallet` mutates the module-global `BAKO_STATE.{state.last_req,
    // period_durtion}` while connecting. Rapid double-clicks or a retry firing
    // while a connect is still in flight would interleave those writes. Chain
    // connects through this promise so they run one-at-a-time.
    private _connectQueue: Promise<unknown> = Promise.resolve()

    setNetworks(networks: NetworkWithTokens[]): void {
        const key = networks.map(n => n.name).join('|')
        if (this._networksKey === key) return
        this._networks = networks
        this._networksKey = key
    }

    private addWallet(wallet: Wallet): void {
        useWalletStore.getState().connectWallet(wallet)
    }

    private removeWallet(providerName: string, connectorName?: string): void {
        useWalletStore.getState().disconnectWallet(providerName, connectorName)
    }

    private getConnectedFromGlobalStore(): Wallet[] {
        return useWalletStore.getState().connectedWallets.filter(w => w.providerName === PROVIDER_NAME)
    }

    getNetworkIcon(): string | undefined {
        return this._networks.find(n => commonSupportedNetworks.some(name => name === n.name))?.logo
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
        const chainId = network.chainId ?? (network.url.toLowerCase().includes('testnet') ? 0 : 9889)
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
            autofillSupportedNetworks: commonSupportedNetworks,
            withdrawalSupportedNetworks: commonSupportedNetworks,
            asSourceSupportedNetworks: commonSupportedNetworks,
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
                if (!addresses || !fuelConnector) return undefined

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
            // TODO: handle error
            console.log(e)
        } finally {
            this.removeWallet(PROVIDER_NAME, connectorName)
        }
    }

    async disconnectWallets(): Promise<void> {
        try {
            BAKO_STATE.state.last_req = undefined
            BAKO_STATE.period_durtion = 10_000
            const connectors = useFuelStore.getState().connectors
            for (const connector of connectors.filter(c => c.connected)) {
                await connector.disconnect()
                this.removeWallet(PROVIDER_NAME)
            }
        } catch (e) {
            // TODO: handle error
            console.log(e)
        }
    }

    async switchAccount(wallet: Wallet): Promise<void> {
        try {
            const fuel = useFuelStore.getState().fuel
            if (!fuel) throw new Error('Fuel instance not available')
            const res = await fuel.selectConnector(wallet.id)
            if (!res) throw new Error('Could not switch account')
        } catch (e) {
            // TODO: handle error
            console.log(e)
        }
    }

    async switchChain(connector: Wallet, chainId: string | number): Promise<void> {
        try {
            const fuelConnector = useFuelStore.getState().connectors.find(c => c.name === connector.id)
            if (!fuelConnector) throw new Error('Connector not found')
            const res = await fuelConnector.selectNetwork({ chainId: Number(chainId) })
            if (!res) throw new Error('Could not switch chain')
        } catch (e) {
            // TODO: handle error
            console.log(e)
        }
    }

    async resolveConnectedWallets(): Promise<Wallet[]> {
        const connectors = useFuelStore.getState().connectors.filter(c => c.connected)
        const wallets: Wallet[] = []
        for (const connector of connectors) {
            try {
                const addresses = (await connector.accounts()).map(a => Address.fromAddressOrString(a).toB256())
                if (connector.connected && addresses.length > 0) {
                    const w = await this.resolveFuelWallet(connector, addresses[0], addresses)
                    wallets.push(w)
                }
            } catch (e) {
                // TODO: handle error
                console.log(e)
            }
        }
        return wallets
    }

    async syncConnectedWallets(): Promise<void> {
        const wallets = await this.resolveConnectedWallets()
        for (const wallet of wallets) {
            this.addWallet(wallet)
        }
    }

    buildProvider(): WalletConnectionProvider {
        const connectedWallets = this.getConnectedFromGlobalStore()
        return {
            connectWallet: this.connectWallet.bind(this),
            disconnectWallets: this.disconnectWallets.bind(this),
            switchAccount: this.switchAccount.bind(this),
            switchChain: this.switchChain.bind(this),

            availableConnectors: this.getAvailableConnectors(),
            autofillSupportedNetworks: commonSupportedNetworks,
            withdrawalSupportedNetworks: commonSupportedNetworks,
            asSourceSupportedNetworks: commonSupportedNetworks,
            activeWallet: connectedWallets[0],
            connectedWallets,
            name: PROVIDER_NAME,
            id: PROVIDER_ID,
            ready: useFuelStore.getState().ready,
        }
    }
}

export const fuelConnectionService = new FuelConnectionService()

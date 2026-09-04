import type { WalletConnectConfig } from '@layerswap/widget-types'
import { ActionMessageType } from '@layerswap/widget-types'
import { AppSettings, isMobile, isValidStellarAddress } from '@layerswap/utils'
import type { ISupportedWallet } from '@creit.tech/stellar-wallets-kit/types'
import type { WalletConnectModule as StellarKitWalletConnectModule } from '@creit.tech/stellar-wallets-kit/modules/wallet-connect'
import { STELLAR_SESSION_KEY } from '../constants'
import {
    STELLAR_APPKIT_WALLET_CONNECT_ID,
    STELLAR_WALLET_CONNECT_ID,
    StellarWalletConnectChain,
    StellarWalletConnectModule,
} from './StellarWalletConnectModule'
import { stellarStore, type StellarWalletSnapshot } from './stellarStore'

type KitSdkModule = typeof import('@creit.tech/stellar-wallets-kit/sdk')
type KitTypesModule = typeof import('@creit.tech/stellar-wallets-kit/types')
type StellarWalletsKitClass = KitSdkModule['StellarWalletsKit']
type KitNetworks = KitTypesModule['Networks']

type StellarPersistedSession = {
    walletId: string
    address: string
}

const STELLAR_APPKIT_WALLET_CONNECT_STORAGE_PREFIX = 'layerswapStellarAppKitWalletConnect'

function readPersistedSession(): StellarPersistedSession | undefined {
    if (typeof window === 'undefined') return undefined
    try {
        const raw = window.localStorage.getItem(STELLAR_SESSION_KEY)
        if (!raw) return undefined
        const value = JSON.parse(raw) as Partial<StellarPersistedSession>
        if (
            typeof value.walletId === 'string'
            && typeof value.address === 'string'
            && value.address.startsWith('G')
            && isValidStellarAddress(value.address)
        ) {
            return { walletId: value.walletId, address: value.address }
        }
    } catch {
        // Storage is optional; an unavailable/corrupt session is ignored.
    }
    return undefined
}

function persistSession(session: StellarPersistedSession | undefined): void {
    if (typeof window === 'undefined') return
    try {
        if (session) {
            window.localStorage.setItem(STELLAR_SESSION_KEY, JSON.stringify(session))
        } else {
            window.localStorage.removeItem(STELLAR_SESSION_KEY)
        }
    } catch {
        // Wallet state still works when storage is unavailable.
    }
}

function toSnapshot(wallet: ISupportedWallet): StellarWalletSnapshot {
    return {
        id: wallet.id,
        name: wallet.name,
        type: wallet.type,
        isAvailable: wallet.isAvailable,
        isPlatformWrapper: wallet.isPlatformWrapper,
        icon: wallet.icon,
        url: wallet.url,
    }
}

function walletError(name: ActionMessageType, message: string): Error {
    const error = new Error(message)
    error.name = name
    return error
}

class StellarKitManager {
    private kit: StellarWalletsKitClass | undefined
    private networks: KitNetworks | undefined
    private initPromise: Promise<void> | undefined
    private detachers: Array<() => void> = []
    private selectedWalletId: string | undefined
    private network: string | undefined
    private walletConnectModule: StellarWalletConnectModule | undefined
    private appKitWalletConnectModule: StellarKitWalletConnectModule | undefined
    private generation = 0

    init(walletConnect?: WalletConnectConfig): Promise<void> {
        if (typeof window === 'undefined') return Promise.resolve()
        if (this.initPromise) return this.initPromise

        const generation = ++this.generation
        stellarStore.getState().setInitializing()
        this.initPromise = this.initialize(walletConnect, generation).catch(error => {
            const message = error instanceof Error ? error.message : String(error)
            if (generation === this.generation) stellarStore.getState().setReady(message)
            throw error
        })
        return this.initPromise
    }

    private async initialize(walletConnect: WalletConnectConfig | undefined, generation: number): Promise<void> {
        const kitPromise = import('@creit.tech/stellar-wallets-kit/sdk')
        const kitTypesPromise = import('@creit.tech/stellar-wallets-kit/types')
        const kitUtilsPromise = import('@creit.tech/stellar-wallets-kit/modules/utils')
        const [kitModule, kitTypesModule, kitUtilsModule] = await Promise.all([
            kitPromise,
            kitTypesPromise,
            kitUtilsPromise,
        ])
        if (generation !== this.generation) return

        const isTestnet = AppSettings.ApiVersion === 'testnet' || AppSettings.ApiVersion === 'sandbox'
        const network = isTestnet ? kitTypesModule.Networks.TESTNET : kitTypesModule.Networks.PUBLIC
        const modules = kitUtilsModule.defaultModules()
        if (walletConnect?.projectId) {
            this.walletConnectModule = new StellarWalletConnectModule(walletConnect, undefined, [isTestnet ? StellarWalletConnectChain.Testnet : StellarWalletConnectChain.Public,])
            modules.push(this.walletConnectModule)
            this.detachers.push(this.walletConnectModule.onSessionDelete(() => this.clearSession()))
            if (isMobile()) {
                const { WalletConnectModule, WalletConnectTargetChain } = await import('@creit.tech/stellar-wallets-kit/modules/wallet-connect')
                if (generation !== this.generation) return
                const appKitModule = new WalletConnectModule({
                    projectId: walletConnect.projectId,
                    metadata: { name: walletConnect.name, description: walletConnect.description, url: walletConnect.url, icons: walletConnect.icons, },
                    signClientOptions: { customStoragePrefix: STELLAR_APPKIT_WALLET_CONNECT_STORAGE_PREFIX },
                    allowedChains: [isTestnet ? WalletConnectTargetChain.TESTNET : WalletConnectTargetChain.PUBLIC],
                })
                appKitModule.productId = STELLAR_APPKIT_WALLET_CONNECT_ID
                this.appKitWalletConnectModule = appKitModule
                modules.push(appKitModule)
            }
        }

        const persisted = readPersistedSession()
        kitModule.StellarWalletsKit.init({
            modules,
            selectedWalletId: persisted?.walletId,
            network,
        })
        this.kit = kitModule.StellarWalletsKit
        this.networks = kitTypesModule.Networks
        this.network = network
        this.attachEvents(kitModule, kitTypesModule)

        const wallets = await this.kit.refreshSupportedWallets()
        if (generation !== this.generation) return
        stellarStore.getState().setWallets(wallets.map(toSnapshot))

        if (persisted && wallets.some(wallet => wallet.id === persisted.walletId)) {
            this.selectedWalletId = persisted.walletId
            this.kit.setWallet(persisted.walletId)
            stellarStore.getState().setActive(persisted.walletId, persisted.address)
        } else if (persisted) {
            persistSession(undefined)
        }
        stellarStore.getState().setReady()
    }

    private attachEvents(kitModule: KitSdkModule, kitTypesModule: KitTypesModule): void {
        const kit = kitModule.StellarWalletsKit
        this.detachers.push(
            kit.on(kitTypesModule.KitEventType.STATE_UPDATED, event => {
                stellarStore.getState().setNetworkPassphrase(event.payload.networkPassphrase || undefined)
                const address = event.payload.address
                const walletId = this.selectedWalletId ?? stellarStore.getState().activeWalletId
                if (walletId && address?.startsWith('G') && isValidStellarAddress(address)) {
                    stellarStore.getState().setActive(walletId, address)
                    persistSession({ walletId, address })
                }
            }),
            kit.on(kitTypesModule.KitEventType.WALLET_SELECTED, event => {
                this.selectedWalletId = event.payload.id
            }),
            kit.on(kitTypesModule.KitEventType.DISCONNECT, () => this.clearSession()),
        )
    }

    async connect(walletId: string): Promise<{ address: string }> {
        await this.requireReady()
        const kit = this.requireKit()
        const previousWalletId = stellarStore.getState().activeWalletId
        try {
            this.selectedWalletId = walletId
            kit.setWallet(walletId)
            const { address } = await kit.fetchAddress()
            this.assertSourceAddress(address)
            if (this.network) await this.assertWalletNetwork(this.network)
            stellarStore.getState().setActive(walletId, address)
            persistSession({ walletId, address })
            return { address }
        } catch (error) {
            this.selectedWalletId = previousWalletId
            if (previousWalletId) kit.setWallet(previousWalletId)
            throw error instanceof Error ? error : new Error((error as { message: string }).message)
        }
    }

    onDisplayUri(listener: (uri: string) => void): () => void {
        return this.walletConnectModule?.onDisplayUri(listener) ?? (() => { })
    }

    warmUpWalletConnect(): void {
        this.walletConnectModule?.warmup()
    }

    async revalidate(expectedAddress: string, networkPassphrase: string): Promise<void> {
        await this.requireReady()
        const kit = this.requireKit()
        const { activeWalletId } = stellarStore.getState()
        if (!activeWalletId) {
            throw walletError(ActionMessageType.WaletMismatch, 'Stellar wallet is not connected')
        }

        this.selectedWalletId = activeWalletId
        kit.setWallet(activeWalletId)
        await this.assertWalletNetwork(networkPassphrase)

        const { address } = activeWalletId === STELLAR_WALLET_CONNECT_ID && this.walletConnectModule
            ? await this.walletConnectModule.getConnectedAddress(expectedAddress)
            : activeWalletId === STELLAR_APPKIT_WALLET_CONNECT_ID && this.appKitWalletConnectModule
                ? await this.getAppKitConnectedAddress(this.appKitWalletConnectModule, expectedAddress)
                : await kit.fetchAddress().catch((error: { message: string }) => { throw new Error(error.message) })
        this.assertSourceAddress(address)
        if (address !== expectedAddress) {
            throw walletError(ActionMessageType.WaletMismatch, 'The connected Stellar account changed')
        }
        stellarStore.getState().setActive(activeWalletId, address)
        persistSession({ walletId: activeWalletId, address })
    }

    async signTransaction(
        xdr: string,
        networkPassphrase: string,
        address: string,
    ): Promise<{ signedTxXdr: string; signerAddress?: string }> {
        const kit = this.requireKit()
        const networks = this.networks
        if (networks) {
            const knownNetwork = Object.values(networks).find(value => value === networkPassphrase)
            if (knownNetwork) kit.setNetwork(knownNetwork)
        }
        return kit.signTransaction(xdr, { networkPassphrase, address })
            .catch((error: { message: string }) => { throw new Error(error.message) })
    }

    async refreshWallets(): Promise<void> {
        await this.requireReady()
        const wallets = await this.requireKit().refreshSupportedWallets()
        stellarStore.getState().setWallets(wallets.map(toSnapshot))
    }

    async disconnect(): Promise<void> {
        try {
            await this.kit?.disconnect()
        } finally {
            this.clearSession()
        }
    }

    dispose(): void {
        this.generation += 1
        for (const detach of this.detachers.splice(0)) detach()
        this.walletConnectModule?.dispose()
        this.walletConnectModule = undefined
        this.appKitWalletConnectModule = undefined
        this.kit = undefined
        this.networks = undefined
        this.initPromise = undefined
        this.selectedWalletId = undefined
    }

    private async requireReady(): Promise<void> {
        if (!this.initPromise) throw new Error('Stellar Wallets Kit is not initialized')
        await this.initPromise
    }

    private requireKit(): StellarWalletsKitClass {
        if (!this.kit) throw new Error('Stellar Wallets Kit is not initialized')
        return this.kit
    }

    private async assertWalletNetwork(expected: string): Promise<void> {
        const walletNetwork = await this.requireKit().getNetwork().catch(() => undefined)
        if (walletNetwork?.networkPassphrase && walletNetwork.networkPassphrase !== expected) {
            const target = expected === this.networks?.TESTNET ? 'Testnet' : 'Mainnet'
            throw new Error(`The wallet is on the wrong network. Switch it to Stellar ${target}, then try again`)
        }
    }

    private async getAppKitConnectedAddress(module: StellarKitWalletConnectModule, expectedAddress: string,): Promise<{ address: string }> {
        const sessions = await module.getSessions()
        const connected = sessions.some(session => (session.namespaces['stellar']?.accounts ?? []).some(account => account.split(':')[2] === expectedAddress))
        if (!connected) {
            throw new Error('The Stellar WalletConnect session expired; reconnect the wallet')
        }
        return { address: expectedAddress }
    }

    private assertSourceAddress(address: string): void {
        if (!address.startsWith('G') || !isValidStellarAddress(address)) {
            throw new Error('The selected wallet did not return a valid Stellar G-address')
        }
    }

    private clearSession(): void {
        persistSession(undefined)
        this.selectedWalletId = undefined
        stellarStore.getState().setActive(undefined, undefined)
        stellarStore.getState().setNetworkPassphrase(undefined)
    }
}

export const stellarKitManager = new StellarKitManager()

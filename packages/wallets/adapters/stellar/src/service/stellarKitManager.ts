import type { WalletConnectConfig } from '@layerswap/widget-types'
import { ActionMessageType } from '@layerswap/widget-types'
import { isValidStellarAddress } from '@layerswap/utils'
import type { ISupportedWallet } from '@creit.tech/stellar-wallets-kit/types'
import { STELLAR_SESSION_KEY } from '../constants'
import {
    STELLAR_WALLET_CONNECT_ID,
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
    private walletConnectModule: StellarWalletConnectModule | undefined
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

        const modules = kitUtilsModule.defaultModules()
        if (walletConnect?.projectId) {
            this.walletConnectModule = new StellarWalletConnectModule(walletConnect)
            modules.push(this.walletConnectModule)
            this.detachers.push(this.walletConnectModule.onSessionDelete(() => this.clearSession()))
        }

        const persisted = readPersistedSession()
        kitModule.StellarWalletsKit.init({
            modules,
            selectedWalletId: persisted?.walletId,
            network: kitTypesModule.Networks.PUBLIC,
        })
        this.kit = kitModule.StellarWalletsKit
        this.networks = kitTypesModule.Networks
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
            stellarStore.getState().setActive(walletId, address)
            persistSession({ walletId, address })
            return { address }
        } catch (error) {
            this.selectedWalletId = previousWalletId
            if (previousWalletId) kit.setWallet(previousWalletId)
            throw error
        }
    }

    onDisplayUri(listener: (uri: string) => void): () => void {
        return this.walletConnectModule?.onDisplayUri(listener) ?? (() => {})
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
        try {
            const walletNetwork = await kit.getNetwork()
            if (walletNetwork.networkPassphrase && walletNetwork.networkPassphrase !== networkPassphrase) {
                throw walletError(ActionMessageType.WaletMismatch, 'Switch the Stellar wallet to the selected network')
            }
        } catch (error) {
            if ((error as Error)?.name === ActionMessageType.WaletMismatch) throw error
            // Some modules cannot report their network but can still sign with
            // an explicit SEP-43 network passphrase.
        }

        const { address } = activeWalletId === STELLAR_WALLET_CONNECT_ID && this.walletConnectModule
            ? await this.walletConnectModule.getConnectedAddress(expectedAddress)
            : await kit.fetchAddress()
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

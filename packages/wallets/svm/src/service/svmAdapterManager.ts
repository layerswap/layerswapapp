import type { Adapter, SignerWalletAdapter } from '@solana/wallet-adapter-base'
import { snapshotFromSvmAdapter, useSvmStore } from './svmStore'

const STORAGE_KEY = 'walletAdapterPreviouslySelectedName'

class SvmAdapterManager {
    private _adapters: Adapter[] = []
    private _selectedName: string | undefined
    private _detachers = new WeakMap<Adapter, () => void>()
    private _autoConnectAttempted = false

    register(adapters: Adapter[]): void {
        this.dispose()
        this._adapters = adapters

        for (const adapter of adapters) {
            this._attach(adapter)
        }
        this._pushWallets()

        // Restore previously selected wallet (mirrors @solana/wallet-adapter-react)
        if (typeof window !== 'undefined') {
            try {
                const prev = window.localStorage.getItem(STORAGE_KEY)
                if (prev) {
                    const parsed = JSON.parse(prev)
                    if (typeof parsed === 'string') this._selectedName = parsed
                }
            } catch { /* swallow */ }

            if (this._selectedName) {
                this._setActiveFromAdapter()
                if (!this._autoConnectAttempted) {
                    this._autoConnectAttempted = true
                    const active = this.getActiveAdapter()
                    active?.autoConnect?.().catch(() => { /* swallow */ })
                }
            }
        }
    }

    private _attach(adapter: Adapter): void {
        const onConnect = () => {
            if (this._selectedName === adapter.name) {
                this._setActiveFromAdapter()
            }
            this._pushWallets()
        }
        const onDisconnect = () => {
            if (this._selectedName === adapter.name) {
                useSvmStore.getState()._setActive(undefined, undefined)
            }
            this._pushWallets()
        }
        const onReadyStateChange = () => this._pushWallets()

        adapter.on('connect', onConnect)
        adapter.on('disconnect', onDisconnect)
        adapter.on('readyStateChange', onReadyStateChange)

        this._detachers.set(adapter, () => {
            adapter.off('connect', onConnect)
            adapter.off('disconnect', onDisconnect)
            adapter.off('readyStateChange', onReadyStateChange)
        })
    }

    private _pushWallets(): void {
        useSvmStore.getState()._setWallets(this._adapters.map(snapshotFromSvmAdapter))
    }

    private _setActiveFromAdapter(): void {
        const adapter = this.getActiveAdapter()
        useSvmStore.getState()._setActive(adapter?.name, adapter?.publicKey?.toBase58())
    }

    getAdapter(name: string): Adapter | undefined {
        return this._adapters.find(a => a.name === name)
    }

    getAdapters(): readonly Adapter[] {
        return this._adapters
    }

    getActiveAdapter(): Adapter | undefined {
        if (!this._selectedName) return undefined
        return this.getAdapter(this._selectedName)
    }

    getActiveSignerAdapter(): SignerWalletAdapter | undefined {
        const adapter = this.getActiveAdapter() as SignerWalletAdapter | undefined
        if (!adapter || typeof adapter.signTransaction !== 'function') return undefined
        return adapter
    }

    select(name: string | undefined): void {
        this._selectedName = name
        if (typeof window !== 'undefined') {
            try {
                if (name) window.localStorage.setItem(STORAGE_KEY, JSON.stringify(name))
                else window.localStorage.removeItem(STORAGE_KEY)
            } catch { /* swallow */ }
        }
        this._setActiveFromAdapter()
    }

    async disconnect(): Promise<void> {
        const adapter = this.getActiveAdapter()
        if (!adapter) return
        await adapter.disconnect()
        this._selectedName = undefined
        if (typeof window !== 'undefined') {
            try { window.localStorage.removeItem(STORAGE_KEY) } catch { /* swallow */ }
        }
        useSvmStore.getState()._setActive(undefined, undefined)
    }

    dispose(): void {
        for (const adapter of this._adapters) {
            const detach = this._detachers.get(adapter)
            detach?.()
            this._detachers.delete(adapter)
        }
        this._adapters = []
        this._selectedName = undefined
        this._autoConnectAttempted = false
    }
}

export const svmAdapterManager = new SvmAdapterManager()

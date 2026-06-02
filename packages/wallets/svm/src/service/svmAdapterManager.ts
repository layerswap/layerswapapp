import { isWalletAdapterCompatibleStandardWallet } from '@solana/wallet-adapter-base'
import type { Adapter, SignerWalletAdapter } from '@solana/wallet-adapter-base'
import { StandardWalletAdapter } from '@solana/wallet-standard-wallet-adapter-base'
import { getWallets } from '@wallet-standard/app'
import { snapshotFromSvmAdapter, useSvmStore } from './svmStore'

const STORAGE_KEY = 'walletAdapterPreviouslySelectedName'

type StandardWallet = ReturnType<ReturnType<typeof getWallets>['get']>[number]

class SvmAdapterManager {
    /** Manually-instantiated adapters passed to register() (Phantom, WalletConnect, …). */
    private _manualAdapters: Adapter[] = []
    /** Adapters wrapping wallets discovered via the Wallet Standard registry (MetaMask, Backpack, …). */
    private _standardAdapters: StandardWalletAdapter[] = []
    /** Merged, name-deduped view exposed to the rest of the app. */
    private _adapters: Adapter[] = []
    private _selectedName: string | undefined
    private _detachers = new WeakMap<Adapter, () => void>()
    private _autoConnectAttempted = false
    private _standardOff: (() => void) | undefined

    register(adapters: Adapter[]): void {
        this.dispose()
        this._manualAdapters = adapters

        // Restore previously selected wallet (mirrors @solana/wallet-adapter-react)
        if (typeof window !== 'undefined') {
            try {
                const prev = window.localStorage.getItem(STORAGE_KEY)
                if (prev) {
                    const parsed = JSON.parse(prev)
                    if (typeof parsed === 'string') this._selectedName = parsed
                }
            } catch { /* swallow */ }
        }

        this._subscribeStandard()
        this._recompute()
        this._tryRestoreSelection()
    }

    /**
     * Subscribe to the Wallet Standard registry so wallets that only expose
     * themselves as Standard Wallets — e.g. MetaMask's Solana support — are
     * discovered and wrapped as adapters. Without this they never appear in the
     * Solana connector list, which is why MetaMask dropped Solana after the
     * move away from @solana/wallet-adapter-react's <WalletProvider>.
     */
    private _subscribeStandard(): void {
        if (typeof window === 'undefined') return

        let api: ReturnType<typeof getWallets>
        try {
            api = getWallets()
        } catch { return }

        const { get, on } = api
        this._standardAdapters = this._wrapStandard(get())

        const offRegister = on('register', (...wallets) => {
            this._standardAdapters = [...this._standardAdapters, ...this._wrapStandard(wallets)]
            this._recompute()
            this._tryRestoreSelection()
        })
        const offUnregister = on('unregister', (...wallets) => {
            this._standardAdapters = this._standardAdapters.filter(
                adapter => !wallets.some(wallet => wallet === adapter.wallet)
            )
            this._recompute()
        })

        this._standardOff = () => { offRegister(); offUnregister() }
    }

    private _wrapStandard(wallets: readonly StandardWallet[]): StandardWalletAdapter[] {
        return wallets
            .filter(isWalletAdapterCompatibleStandardWallet)
            .map(wallet => new StandardWalletAdapter({ wallet }))
    }

    /** Recompute the merged adapter list (standard wins on name collisions) and re-bind listeners. */
    private _recompute(): void {
        for (const adapter of this._adapters) {
            this._detachers.get(adapter)?.()
            this._detachers.delete(adapter)
        }

        const standardNames = new Set(this._standardAdapters.map(a => a.name))
        this._adapters = [
            ...this._standardAdapters,
            ...this._manualAdapters.filter(a => !standardNames.has(a.name)),
        ]

        for (const adapter of this._adapters) {
            this._attach(adapter)
        }
        this._pushWallets()
    }

    /**
     * Re-apply a persisted selection and attempt auto-connect once the adapter
     * exists. Standard wallets can register after register() runs, so this is
     * retried on each registry change until the selected adapter is found.
     */
    private _tryRestoreSelection(): void {
        if (typeof window === 'undefined' || !this._selectedName) return
        this._setActiveFromAdapter()
        if (this._autoConnectAttempted) return
        const active = this.getActiveAdapter()
        if (!active) return
        this._autoConnectAttempted = true
        active.autoConnect?.().catch(() => { /* swallow */ })
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
        this._standardOff?.()
        this._standardOff = undefined
        for (const adapter of this._adapters) {
            const detach = this._detachers.get(adapter)
            detach?.()
            this._detachers.delete(adapter)
        }
        this._adapters = []
        this._manualAdapters = []
        this._standardAdapters = []
        this._selectedName = undefined
        this._autoConnectAttempted = false
    }
}

export const svmAdapterManager = new SvmAdapterManager()

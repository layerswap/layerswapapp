import { snapshotFromTronAdapter, useTronStore, type TronAdapter, type TronTransaction, type TronSignedTransaction } from './tronStore'
const SELECTED_ADAPTER_KEY = 'tronAdapterName'

const readSelectedAdapter = (): string | undefined => {
    if (typeof window === 'undefined') return undefined

    try {
        const storedName = window.localStorage.getItem(SELECTED_ADAPTER_KEY)
        if (!storedName) return undefined

        const parsedName: unknown = JSON.parse(storedName)
        return typeof parsedName === 'string' ? parsedName : undefined
    } catch {
        return undefined
    }
}

const persistSelectedAdapter = (name: string | undefined): void => {
    if (typeof window === 'undefined') return

    try {
        if (name) {
            window.localStorage.setItem(SELECTED_ADAPTER_KEY, JSON.stringify(name))
        } else {
            window.localStorage.removeItem(SELECTED_ADAPTER_KEY)
        }
    } catch {
        // Wallet state still works when storage is unavailable.
    }
}

class TronAdapterManager {
    private _adapters: TronAdapter[] = []
    private _selectedName: string | undefined
    private _detachers = new WeakMap<TronAdapter, () => void>()

    register(adapters: TronAdapter[]): void {
        this.dispose()
        this._adapters = adapters

        const selectedName = readSelectedAdapter()
        if (selectedName && this.getAdapter(selectedName)) {
            this._selectedName = selectedName
        } else if (selectedName) {
            persistSelectedAdapter(undefined)
        }

        for (const adapter of adapters) {
            this._attach(adapter)
        }
        this._restoreSelectedAdapter()
        this._pushWallets()
    }

    private _attach(adapter: TronAdapter): void {
        const onConnect = (address: string) => {
            if (this._selectedName === adapter.name) {
                const connectedAddress = address || adapter.address || undefined
                useTronStore.getState()._setActive(adapter.name, connectedAddress)
            }
            this._pushWallets()
        }
        const onDisconnect = () => {
            if (this._selectedName === adapter.name) {
                useTronStore.getState()._setActive(undefined, undefined)
            }
            this._pushWallets()
        }
        const onAccountsChanged = (address: string) => {
            if (this._selectedName === adapter.name) {
                useTronStore.getState()._setActive(adapter.name, address || undefined)
            }
        }
        const onStateChanged = () => this._pushWallets()
        const onReadyStateChanged = () => this._pushWallets()

        adapter.on('connect', onConnect)
        adapter.on('disconnect', onDisconnect)
        adapter.on('accountsChanged', onAccountsChanged)
        adapter.on('stateChanged', onStateChanged)
        adapter.on('readyStateChanged', onReadyStateChanged)

        this._detachers.set(adapter, () => {
            adapter.off('connect', onConnect)
            adapter.off('disconnect', onDisconnect)
            adapter.off('accountsChanged', onAccountsChanged)
            adapter.off('stateChanged', onStateChanged)
            adapter.off('readyStateChanged', onReadyStateChanged)
        })
    }

    private _restoreSelectedAdapter(): void {
        const adapter = this.getActiveAdapter()
        if (!adapter?.connected || !adapter.address) return

        useTronStore.getState()._setActive(adapter.name, adapter.address)
    }

    private _pushWallets(): void {
        const wallets = this._adapters.map(snapshotFromTronAdapter)
        useTronStore.getState()._setWallets(wallets)
    }

    getAdapter(name: string): TronAdapter | undefined {
        return this._adapters.find(a => a.name === name)
    }

    getActiveAdapter(): TronAdapter | undefined {
        if (!this._selectedName) return undefined
        return this.getAdapter(this._selectedName)
    }

    getConnectedAdapter(): TronAdapter | undefined {
        return this._adapters.find(adapter => adapter.connected)
    }

    select(name: string): void {
        this._selectedName = name
        persistSelectedAdapter(name)
    }

    async connect(): Promise<void> {
        const adapter = this.getActiveAdapter()
        if (!adapter) throw new Error('No Tron wallet selected')
        try {
            await adapter.connect()

            if (adapter.connected && adapter.address) {
                useTronStore.getState()._setActive(adapter.name, adapter.address)
                this._pushWallets()
            }
        } catch (error) {
            persistSelectedAdapter(undefined)
            this._selectedName = undefined
            useTronStore.getState()._setActive(undefined, undefined)
            throw error
        }
    }

    async disconnect(): Promise<void> {
        const adapter = this.getActiveAdapter()
        persistSelectedAdapter(undefined)

        try {
            await adapter?.disconnect()
        } finally {
            this._selectedName = undefined
            useTronStore.getState()._setActive(undefined, undefined)
            this._pushWallets()
        }
    }

    async signTransaction(transaction: TronTransaction): Promise<TronSignedTransaction> {
        const adapter = this.getActiveAdapter()
        if (!adapter) throw new Error('Tron wallet not connected')
        return adapter.signTransaction(transaction)
    }

    dispose(): void {
        for (const adapter of this._adapters) {
            const detach = this._detachers.get(adapter)
            detach?.()
            this._detachers.delete(adapter)
        }
        this._adapters = []
        this._selectedName = undefined
    }
}

export const tronAdapterManager = new TronAdapterManager()

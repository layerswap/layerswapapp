import { snapshotFromTronAdapter, useTronStore, type TronAdapter, type TronTransaction, type TronSignedTransaction } from './tronStore'

class TronAdapterManager {
    private _adapters: TronAdapter[] = []
    private _selectedName: string | undefined
    private _detachers = new WeakMap<TronAdapter, () => void>()

    register(adapters: TronAdapter[]): void {
        this.dispose()
        this._adapters = adapters
        for (const adapter of adapters) {
            this._attach(adapter)
        }
        this._pushWallets()
    }

    private _attach(adapter: TronAdapter): void {
        const onConnect = (address: string) => {
            if (this._selectedName === adapter.name) {
                useTronStore.getState()._setActive(adapter.name, address || undefined)
            }
            this._pushWallets()
        }
        const onDisconnect = () => {
            if (this._selectedName === adapter.name) {
                this._selectedName = undefined
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

    getSelectedName(): string | undefined {
        return this._selectedName
    }

    select(name: string | undefined): void {
        this._selectedName = name
    }

    async connect(): Promise<void> {
        const adapter = this.getActiveAdapter()
        if (!adapter) throw new Error('No Tron wallet selected')
        await adapter.connect()
    }

    async disconnect(): Promise<void> {
        const adapter = this.getActiveAdapter()
        if (!adapter) return
        await adapter.disconnect()
        this._selectedName = undefined
        useTronStore.getState()._setActive(undefined, undefined)
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

/**
 * Vanilla external store exposing the minimal slice of connect-modal state
 * that wallet packages need to read/write from outside React render. The
 * existing React `WalletModalProvider` mirrors its state here.
 */

type SelectedConnectorLike = { id: string;[key: string]: unknown } | undefined

export type ConnectModalSnapshot = {
    isWalletModalOpen: boolean
    selectedConnector: SelectedConnectorLike
}

export type ConnectModalStore = {
    subscribe(listener: () => void): () => void
    getSnapshot(): ConnectModalSnapshot
    setSelectedConnector(connector: SelectedConnectorLike): void
    _syncOpen(open: boolean): void
    _syncSelectedConnector(connector: SelectedConnectorLike): void
    _registerWriter(fn: (connector: SelectedConnectorLike) => void): () => void
}

const EMPTY: ConnectModalSnapshot = Object.freeze({
    isWalletModalOpen: false,
    selectedConnector: undefined,
})

let snapshot: ConnectModalSnapshot = EMPTY
const listeners = new Set<() => void>()
let writer: ((connector: SelectedConnectorLike) => void) | null = null

const emit = () => listeners.forEach(l => l())

export const connectModalStore: ConnectModalStore = {
    subscribe(listener) {
        listeners.add(listener)
        return () => listeners.delete(listener)
    },
    getSnapshot() {
        return snapshot
    },
    setSelectedConnector(connector) {
        writer?.(connector)
    },
    _syncOpen(open) {
        if (snapshot.isWalletModalOpen === open) return
        snapshot = { ...snapshot, isWalletModalOpen: open }
        emit()
    },
    _syncSelectedConnector(connector) {
        if (snapshot.selectedConnector === connector) return
        snapshot = { ...snapshot, selectedConnector: connector }
        emit()
    },
    _registerWriter(fn) {
        writer = fn
        return () => {
            if (writer === fn) writer = null
        }
    },
}

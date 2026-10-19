export type WalletRequest = {
    sequence: number
    walletName: string
    /** WalletConnect session topic the request was sent on. */
    topic: string
    namespace: string
    accounts: string[]
    href?: string
}

let snapshot: WalletRequest | null = null
const listeners = new Set<() => void>()

/** Ephemeral request metadata only; never persists pairing URIs or signatures. */
export const walletRequestStore = {
    getSnapshot: () => snapshot,
    getServerSnapshot: (): WalletRequest | null => null,
    subscribe(listener: () => void) {
        listeners.add(listener)
        return () => { listeners.delete(listener) }
    },
}

export function recordWalletRequest(request: Omit<WalletRequest, 'sequence'>): void {
    snapshot = { ...request, sequence: (snapshot?.sequence ?? 0) + 1 }
    listeners.forEach(listener => listener())
}

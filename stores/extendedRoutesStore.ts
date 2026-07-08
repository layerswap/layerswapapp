import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

/**
 * Persisted record of an extended-route flow, keyed by `swap.id`. Lets the
 * post-create UI keep showing the extended source (e.g. Hyperliquid) and lets
 * the withdraw step resume after a reload. Absent on another device → the UI
 * degrades gracefully to the real (Base) identity and manual withdrawal.
 */
export type ExtendedRouteRecord = {
    providerId: string
    extendedNetwork: string
    extendedToken: string
    realNetwork: string
    realToken: string
    /** Extended source account owner (EVM address). */
    sourceAddress: string
    /** A — the amount that leaves the extended source (sendToEvmWithData amount). */
    sourceAmount: string
    createdAt: number
    /** Polymarket: the derived Safe (proxy) wallet that holds the funds. */
    proxyWallet?: string
    /** Polymarket: the one-time bridge address pUSD is sent to. Persisted so a retry
     * or reload reuses it instead of minting a new bridge address (and stranding a
     * partial transfer). */
    bridgeAddress?: string
}

type ExtendedRoutesStore = {
    records: Record<string, ExtendedRouteRecord>
    setRecord: (id: string, record: ExtendedRouteRecord) => void
    removeRecord: (id: string) => void
}

export const useExtendedRoutesStore = create(
    persist<ExtendedRoutesStore>(
        (set) => ({
            records: {},
            setRecord: (id, record) => {
                set((state) => ({ records: { ...state.records, [id]: record } }))
            },
            removeRecord: (id) => {
                set((state) => {
                    const { [id]: _removed, ...rest } = state.records
                    return { records: rest }
                })
            },
        }),
        {
            name: 'extendedRoutes',
            storage: createJSONStorage(() => localStorage),
        }
    ),
)

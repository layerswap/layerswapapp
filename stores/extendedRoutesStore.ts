import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import { ExtendedFulfillmentMode } from '@/lib/extendedRoutes/types';

/**
 * Persisted record of an extended-route flow. Keyed by `swap.id` (bridge mode)
 * or a generated uuid (direct mode). Lets the post-create UI keep showing the
 * extended source (e.g. Hyperliquid) and lets the withdraw step resume after a
 * reload. Absent on another device → the UI degrades gracefully to the real
 * (Base) identity and manual withdrawal.
 */
export type ExtendedRouteWithdrawal = {
    submittedAt: number
    nonce: number
    amount: string
    destination: string
}

export type ExtendedRouteRecord = {
    providerId: string
    mode: ExtendedFulfillmentMode
    extendedNetwork: string
    extendedToken: string
    realNetwork: string
    realToken: string
    /** HL account owner (EVM address). */
    sourceAddress: string
    /** A — the amount that leaves the extended source (sendToEvmWithData amount). */
    sourceAmount: string
    /** Direct mode: the recipient. */
    destinationAddress?: string
    createdAt: number
    withdrawal?: ExtendedRouteWithdrawal
}

type ExtendedRoutesStore = {
    records: Record<string, ExtendedRouteRecord>
    setRecord: (id: string, record: ExtendedRouteRecord) => void
    setWithdrawal: (id: string, withdrawal: ExtendedRouteWithdrawal) => void
    removeRecord: (id: string) => void
}

export const useExtendedRoutesStore = create(
    persist<ExtendedRoutesStore>(
        (set) => ({
            records: {},
            setRecord: (id, record) => {
                set((state) => ({ records: { ...state.records, [id]: record } }))
            },
            setWithdrawal: (id, withdrawal) => {
                set((state) => {
                    const existing = state.records[id]
                    if (!existing) return state
                    return { records: { ...state.records, [id]: { ...existing, withdrawal } } }
                })
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
